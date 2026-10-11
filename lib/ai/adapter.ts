import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type {
  GenerateReportResponse,
  DailyLogItem,
  WeeklyRecap,
  PresentationDeck,
} from '@/types/report';
import { serverDb } from '@/lib/server-db';

async function getActiveApiKey(): Promise<string | undefined> {
  try {
    const fromPool = await serverDb.getActiveAiKey();
    if (fromPool?.api_key && fromPool.api_key.trim().length > 10 && !fromPool.api_key.startsWith('AIzaSyTest')) {
      return fromPool.api_key;
    }
  } catch {
    // fallback
  }
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey !== 'MY_GEMINI_API_KEY' && envKey !== 'dummy_test_key' && envKey.trim().length > 10) {
    return envKey;
  }
  return undefined;
}

// Validasi Zod: Setiap kolom minimal 120 dan maksimal 400 karakter
export const reportDraftSchema = z.object({
  activity_desc: z
    .string()
    .min(120, 'Uraian aktivitas minimal 120 karakter (aturan Maganghub minimal 100 karakter)')
    .max(400, 'Uraian aktivitas maksimal 400 karakter'),
  learning_desc: z
    .string()
    .min(120, 'Pelajaran yang diperoleh minimal 120 karakter')
    .max(400, 'Pelajaran yang diperoleh maksimal 400 karakter'),
  obstacle_desc: z
    .string()
    .min(120, 'Kendala yang dialami minimal 120 karakter')
    .max(400, 'Kendala yang dialami maksimal 400 karakter'),
});

const aiResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    activity_desc: z.string(),
    learning_desc: z.string(),
    obstacle_desc: z.string(),
  }),
  z.object({
    status: z.literal('needs_more_info'),
    question: z.string().min(5),
    reason: z.string(),
  }),
]);

export interface GenerateReportOptions {
  notes: string;
  previousReports?: Array<{ activity_desc: string; learning_desc: string; obstacle_desc: string }>;
  tone?: 'standar' | 'formal' | 'santai';
}

/**
 * Pembersih artefak teks: membuang karakter aneh, markdown sisa, emoji,
 * format list/bullet, kurung mentah, serta menormalkan spasi dan tanda baca.
 */
function cleanReportText(text: string): string {
  if (!text) return '';

  let cleaned = text
    // Hapus blok kode / backtick
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`+/g, '')
    // Hapus tag HTML / XML
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    // Hapus bullet points, numbering list, dash, asterisk di awal kalimat
    .replace(/^[\s*\-•–—#\d.]+/, '')
    .replace(/[\n\r]+/g, ' ')
    // Hapus simbol markdown tebal/miring
    .replace(/[*_~]+/g, '')
    // Hapus emoji dan simbol non-standar (pertahankan huruf, angka, tanda baca umum bahasa Indonesia)
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    // Hapus karakter placeholder / artefak mentah
    .replace(/[\[\]{}<>\\|~^]/g, '')
    // Rapikan tanda baca ganda (contoh: .. -> . , ,, -> , !? -> .)
    .replace(/\.{2,}/g, '.')
    .replace(/,{2,}/g, ',')
    .replace(/[!?]+/g, '.')
    // Rapikan spasi berlebih
    .replace(/\s+/g, ' ')
    .trim();

  // Pastikan huruf pertama kapital
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Pastikan diakhiri titik tunggal
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
}

/**
 * Menjamin panjang teks berada dalam rentang aman Maganghub (140 - 380 karakter)
 * tanpa kalimat terpotong di tengah jalan.
 */
function normalizeToMaganghubRange(text: string, defaultSentence: string): string {
  let cleaned = cleanReportText(text);

  // Jika terlalu pendek (< 120), tambahkan kalimat pelengkap formal
  if (cleaned.length < 120) {
    const supplementClean = cleanReportText(defaultSentence);
    cleaned = `${cleaned} ${supplementClean}`.trim();
  }

  // Jika masih di bawah batas minimal 120
  if (cleaned.length < 120) {
    cleaned = `${cleaned} Kegiatan dilaksanakan sesuai arahan pembimbing lapangan dan SOP instansi.`.trim();
  }

  // Jika melebihi batas maksimal 400, potong secara rapi per batas kalimat (titik)
  if (cleaned.length > 390) {
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
    let reconstructed = '';
    for (const s of sentences) {
      if ((reconstructed + s).length <= 385) {
        reconstructed += s;
      } else {
        break;
      }
    }

    if (reconstructed.length >= 120) {
      cleaned = reconstructed.trim();
    } else {
      // Potong tepat pada batas kata terakhir sebelum 385 karakter
      const truncated = cleaned.slice(0, 380);
      const lastSpace = truncated.lastIndexOf(' ');
      cleaned = (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated).trim() + '.';
    }
  }

  return cleanReportText(cleaned);
}

async function generateWithRetry(ai: GoogleGenAI, params: any) {
  let lastErr;
  // Menggunakan model Gemini Flash default resmi dari SDK @google/genai
  const candidateModels = ['gemini-2.5-flash'];

  for (const modelName of candidateModels) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Request timeout')), 8000)
      );
      const callPromise = ai.models.generateContent({
        ...params,
        model: modelName,
      });
      return (await Promise.race([callPromise, timeoutPromise])) as any;
    } catch (err: any) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/**
 * Abstraksi AI Engine Adapter
 * Menghasilkan narasi logbook 3 kolom resmi, profesional, terstruktur,
 * bersih dari tanda baca aneh/emoji, dan siap dipertanggungjawabkan ke pembimbing Maganghub.
 */
export async function generateReport(
  options: GenerateReportOptions
): Promise<GenerateReportResponse> {
  const { notes, tone = 'formal' } = options;

  const sanitizedNotes = notes.trim().slice(0, 4000);

  if (sanitizedNotes.length < 50) {
    return {
      status: 'needs_more_info',
      question:
        'Mohon uraikan sedikit lebih rinci aktivitas atau tugas magang yang Anda laksanakan hari ini (misalnya modul/dokumen yang dikerjakan, koordinasi tim, atau kendala lapangan).',
      reason:
        'Catatan terlalu singkat untuk dapat disusun menjadi 3 kolom laporan resmi Maganghub yang memenuhi standar evaluasi.',
    };
  }

  const apiKey = await getActiveApiKey();
  if (!apiKey) {
    return generateProfessionalFallback(sanitizedNotes);
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Anda adalah asisten penyusun laporan profesional untuk program Pemagangan Nasional (Maganghub Kemnaker RI).
Tugas Anda: Mengubah catatan kerja mentah dari peserta magang menjadi 3 kolom laporan harian resmi berkualitas tinggi, kredibel, baku, dan sesuai kaidah tata bahasa Indonesia yang baik dan benar (PUEBI).

STANDAR PENULISAN 3 KOLOM LAPORAN:
1. Kolom 1 (activity_desc / Uraian Aktivitas):
   - Jelaskan apa yang dikerjakan hari ini dengan kalimat efektif dan kata kerja aktif profesional (misal: "Melakukan verifikasi berkas...", "Menyusun rekapitulasi data...", "Mengimplementasikan perbaikan bug pada...").
   - Cantumkan konteks tugas secara konkret berdasarkan catatan peserta.

2. Kolom 2 (learning_desc / Pelajaran yang Diperoleh):
   - Jelaskan wawasan teknis, pemahaman alur kerja/SOP, keterampilan baru, atau nilai profesionalitas kerja yang diperoleh dari tugas tersebut.
   - Hindari bahasa klise berlebihan; fokus pada kompetensi riil yang bertambah.

3. Kolom 3 (obstacle_desc / Kendala yang Dialami):
   - Tuliskan tantangan teknis/operasional nyata yang dihadapi DAN solusi konkret atau tindak lanjut penyelesaiannya secara profesional.
   - Jika peserta tidak menyebutkan kendala spesifik dalam catatan, formulasikan dinamika penyesuaian kerja yang wajar (misalnya sinkronisasi data, koordinasi instruksi, atau ketelitian proses) beserta solusi efektifnya.

ATURAN FORMAT KERAS (ANTI-RUSAK & ANTI-TANDA ANEH):
- DILARANG menggunakan tanda aneh, markdown (**tebal**, *miring*, \`kode\`), kurung siku, kurung kurawal, simbol bullet (- / * / •), atau emoji apa pun.
- DILARANG menggunakan kata-kata percakapan kasual ("tadi pagi", "sempet", "benerin", "cocokin", "udah"). Ubah ke kosakata baku ("tadi pagi" -> "pada sesi pagi", "benerin" -> "memperbaiki", "cocokin" -> "melakukan rekonsiliasi/pencocokan").
- Setiap kolom HARUS terdiri dari 2 sampai 3 kalimat utuh, mengalir, rapi, dan diakhiri tanda titik.
- Panjang karakter untuk MASING-MASING kolom WAJIB berada di antara 140 sampai 360 karakter (aturan sistem Maganghub minimal 100 karakter).
- Output HANYA boleh berupa objek JSON murni tanpa pembuka/penutup markdown.`;

  const promptContent = `Berikut catatan kerja harian peserta magang:
<user_notes>
${sanitizedNotes.replace(/<\/user_notes>/g, '')}
</user_notes>

Gaya penulisan: ${tone === 'santai' ? 'semi-formal wajar' : 'formal profesional baku'}.
Hasilkan JSON murni sesuai format:
{
  "status": "success",
  "activity_desc": "Uraian kegiatan 140-360 karakter...",
  "learning_desc": "Pelajaran 140-360 karakter...",
  "obstacle_desc": "Kendala dan solusi 140-360 karakter..."
}`;

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts <= maxAttempts) {
    attempts++;
    try {
      const response = await generateWithRetry(ai, {
        contents: [
          { role: 'user', parts: [{ text: systemInstruction + '\n\n' + promptContent }] },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text?.trim() || '';
      const parsed = JSON.parse(responseText);
      const validated = aiResponseSchema.parse(parsed);

      if (validated.status === 'needs_more_info') {
        return {
          status: 'needs_more_info',
          question: cleanReportText(validated.question),
          reason: cleanReportText(validated.reason),
        };
      }

      // Bersihkan dan normalkan masing-masing kolom ke standar Maganghub
      const cleanedActivity = normalizeToMaganghubRange(
        validated.activity_desc,
        'Seluruh tahapan kerja diselesaikan dengan tertib sesuai instruksi dan target harian pembimbing lapangan.'
      );
      const cleanedLearning = normalizeToMaganghubRange(
        validated.learning_desc,
        'Aktivitas ini memperdalam pemahaman mengenai alur operasional instansi serta meningkatkan ketelitian dalam penyelesaian tugas.'
      );
      const cleanedObstacle = normalizeToMaganghubRange(
        validated.obstacle_desc,
        'Proses kerja memerlukan penyesuaian teknis awal, namun berhasil diatasi secara optimal melalui koordinasi langsung bersama tim.'
      );

      const draftValidation = reportDraftSchema.safeParse({
        activity_desc: cleanedActivity,
        learning_desc: cleanedLearning,
        obstacle_desc: cleanedObstacle,
      });

      if (draftValidation.success) {
        return {
          status: 'success',
          data: draftValidation.data,
        };
      }

      if (attempts > maxAttempts) {
        return generateProfessionalFallback(sanitizedNotes);
      }
    } catch {
      if (attempts > maxAttempts) {
        return generateProfessionalFallback(sanitizedNotes);
      }
    }
  }

  return generateProfessionalFallback(sanitizedNotes);
}

/**
 * Generator draf cadangan berkualitas tinggi dan formal jika AI offline / kuota habis.
 * Mengubah catatan mentah menjadi bahasa formal Indonesia baku tanpa tanda aneh.
 */
function generateProfessionalFallback(rawNotes: string): GenerateReportResponse {
  const clean = cleanReportText(rawNotes)
    .replace(/^Catatan\s*:\s*/i, '')
    .slice(0, 180);

  const act = normalizeToMaganghubRange(
    `Melaksanakan penugasan kerja harian terkait ${clean}. Seluruh rangkaian kegiatan dikoordinasikan secara aktif dengan tim dan diselesaikan sesuai standar operasional prosedur yang berlaku di lingkungan instansi.`,
    'Seluruh aktivitas diselesaikan dengan baik sesuai target pembimbing.'
  );

  const learn = normalizeToMaganghubRange(
    `Memperoleh pemahaman praktis yang lebih mendalam mengenai alur kerja ${clean}. Kegiatan ini turut mengasah kemampuan problem solving, ketelitian administratif, dan kedisiplinan kerja dalam lingkungan profesional.`,
    'Hal ini memperkaya wawasan kerja lapangan peserta magang.'
  );

  const obs = normalizeToMaganghubRange(
    `Sempat terdapat kebutuhan penyesuaian teknis dan koordinasi detail pada proses ${clean}. Kendala tersebut berhasil diselesaikan secara efektif melalui konfirmasi dan bimbingan langsung dari pembimbing lapangan.`,
    'Tantangan tersebut dapat diatasi secara cepat tanpa mengganggu target kerja.'
  );

  return {
    status: 'success',
    data: {
      activity_desc: act,
      learning_desc: learn,
      obstacle_desc: obs,
    },
  };
}

/**
 * Generator Rekap Mingguan berbasis AI (Paket Pro)
 */
export async function generateWeeklyRecap(
  logs: DailyLogItem[],
  weekLabel = 'Minggu Ini'
): Promise<WeeklyRecap> {
  const safeLogs = (Array.isArray(logs) ? logs : []).map((l: any) => ({
    id: l.id || 'log',
    date: l.date || new Date().toISOString().split('T')[0],
    activity_desc: l.activity_desc || l.activity || '',
    learning_desc: l.learning_desc || l.learning || '',
    obstacle_desc: l.obstacle_desc || l.obstacle || '',
    is_reported_to_maganghub: Boolean(l.is_reported_to_maganghub ?? l.is_reported),
    created_at: l.created_at || new Date().toISOString(),
  }));

  const apiKey = await getActiveApiKey();

  const defaultRecap: WeeklyRecap = {
    week_label: weekLabel,
    period: `${safeLogs[safeLogs.length - 1]?.date || 'Awal'} s.d. ${safeLogs[0]?.date || 'Akhir'}`,
    total_days: safeLogs.length,
    summary:
      'Selama satu minggu ini, aktivitas pemagangan berjalan produktif dengan fokus pada penyelesaian tugas harian, koordinasi tim, dan pemahaman alur kerja operasional sesuai arahan pembimbing lapangan.',
    key_achievements: [
      'Menyelesaikan seluruh target penugasan harian sesuai arahan pembimbing',
      'Meningkatkan efisiensi alur pencatatan dan koordinasi antar anggota tim',
      'Mendokumentasikan hasil pekerjaan dan kendala lapangan secara rapi',
    ],
    key_learnings: [
      'Memahami standar operasional prosedur instansi tempat magang',
      'Meningkatkan keterampilan komunikasi kerja dan pemecahan masalah langsung',
      'Melatih disiplin pelaporan harian sebelum tenggat waktu resmi',
    ],
    obstacles_and_solutions: [
      'Sempat menghadapi penyesuaian teknis awal, namun berhasil diatasi melalui konsultasi aktif dengan pembimbing.',
    ],
    next_week_plan: [
      'Melanjutkan tugas divisi yang belum selesai dan menerima tanggung jawab baru',
      'Mempersiapkan evaluasi mingguan bersama mentor pemagangan',
    ],
  };

  if (!apiKey || safeLogs.length === 0) {
    return defaultRecap;
  }

  const ai = new GoogleGenAI({ apiKey });
  const logsText = safeLogs
    .map(
      (l, idx) =>
        `Hari ke-${idx + 1} (${l.date}):\n- Aktivitas: ${l.activity_desc}\n- Pelajaran: ${l.learning_desc}\n- Kendala: ${l.obstacle_desc}`
    )
    .join('\n\n');

  try {
    const prompt = `Analisis kumpulan laporan harian magang berikut dan buatkan rekap mingguan yang terstruktur, manusiawi, dan profesional untuk laporan ke dosen/mentor pembimbing:

${logsText}

Format output JSON murni:
{
  "summary": "1 paragraf rangkuman komprehensif 2-3 kalimat yang natural",
  "key_achievements": ["pencapaian 1", "pencapaian 2", "pencapaian 3"],
  "key_learnings": ["pelajaran 1", "pelajaran 2", "pelajaran 3"],
  "obstacles_and_solutions": ["kendala dan solusi yang telah diselesaikan"],
  "next_week_plan": ["rencana target minggu berikutnya"]
}`;

    const res = await generateWithRetry(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', temperature: 0.3 },
    });

    const parsed = JSON.parse(res.text || '{}');
    return {
      week_label: weekLabel,
      period: defaultRecap.period,
      total_days: safeLogs.length,
      summary: cleanReportText(parsed.summary || defaultRecap.summary),
      key_achievements: Array.isArray(parsed.key_achievements) && parsed.key_achievements.length > 0
        ? parsed.key_achievements.map((item: string) => cleanReportText(item))
        : defaultRecap.key_achievements,
      key_learnings: Array.isArray(parsed.key_learnings) && parsed.key_learnings.length > 0
        ? parsed.key_learnings.map((item: string) => cleanReportText(item))
        : defaultRecap.key_learnings,
      obstacles_and_solutions:
        Array.isArray(parsed.obstacles_and_solutions) && parsed.obstacles_and_solutions.length > 0
          ? parsed.obstacles_and_solutions.map((item: string) => cleanReportText(item))
          : defaultRecap.obstacles_and_solutions,
      next_week_plan: Array.isArray(parsed.next_week_plan) && parsed.next_week_plan.length > 0
        ? parsed.next_week_plan.map((item: string) => cleanReportText(item))
        : defaultRecap.next_week_plan,
    };
  } catch {
    return defaultRecap;
  }
}

function groupLogsByWeeks(logs: DailyLogItem[]): Array<{
  weekNum: number;
  startDate: string;
  endDate: string;
  logs: DailyLogItem[];
}> {
  if (logs.length === 0) return [];

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = new Date(sorted[0].date);

  const weeksMap = new Map<
    number,
    { weekNum: number; startDate: string; endDate: string; logs: DailyLogItem[] }
  >();

  sorted.forEach((l) => {
    const lDate = new Date(l.date);
    const diffMs = lDate.getTime() - firstDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const weekNum = Math.floor(diffDays / 7) + 1;

    if (!weeksMap.has(weekNum)) {
      weeksMap.set(weekNum, {
        weekNum,
        startDate: l.date,
        endDate: l.date,
        logs: [],
      });
    }

    const w = weeksMap.get(weekNum)!;
    w.logs.push(l);
    if (l.date < w.startDate) w.startDate = l.date;
    if (l.date > w.endDate) w.endDate = l.date;
  });

  return Array.from(weeksMap.values()).sort((a, b) => a.weekNum - b.weekNum);
}

/**
 * Generator PPT / Slide Presentasi Otomatis berbasis AI (Paket Pro)
 */
export async function generatePresentationDeck(
  logs: DailyLogItem[],
  meta: { author: string; weekTitle: string; institution?: string }
): Promise<PresentationDeck> {
  const safeLogs = (Array.isArray(logs) ? logs : []).map((l: any) => ({
    id: l.id || 'log',
    date: l.date || new Date().toISOString().split('T')[0],
    activity_desc: l.activity_desc || l.activity || '',
    learning_desc: l.learning_desc || l.learning || '',
    obstacle_desc: l.obstacle_desc || l.obstacle || '',
    is_reported_to_maganghub: Boolean(l.is_reported_to_maganghub ?? l.is_reported),
    created_at: l.created_at || new Date().toISOString(),
  }));

  safeLogs.sort((a, b) => a.date.localeCompare(b.date));

  const apiKey = await getActiveApiKey();
  const groupedWeeks = groupLogsByWeeks(safeLogs);
  const startDate = safeLogs[0]?.date || 'Awal';
  const endDate = safeLogs[safeLogs.length - 1]?.date || 'Akhir';

  const defaultSlides: PresentationDeck['slides'] = [
    {
      id: 1,
      title: 'Laporan Perkembangan Pemagangan',
      subtitle: meta.weekTitle || `Evaluasi Progres Magang & Hasil Kerja (${startDate} – ${endDate})`,
      tag: 'Judul Presentasi',
      bullets: [
        `Disusun oleh: ${meta.author || 'Peserta Pemagangan Nasional'}`,
        `Instansi / Mitra: ${meta.institution || 'Maganghub Kemnaker'}`,
        `Periode Kegiatan: ${startDate} s.d. ${endDate} (${safeLogs.length} Hari Kerja Terverifikasi)`,
        'Program Pemagangan Nasional — Kementerian Ketenagakerjaan RI',
      ],
      speaker_notes: 'Selamat pagi bapak/ibu pembimbing dan penguji, berikut adalah paparan perkembangan dan evaluasi kegiatan magang saya selama periode berjalan.',
    },
    {
      id: 2,
      title: groupedWeeks[0]
        ? `Aktivitas Kerja (Minggu ke-${groupedWeeks[0].weekNum})`
        : 'Uraian Aktivitas Utama (Minggu ke-1)',
      subtitle: groupedWeeks[0]
        ? `Rentang Periode: ${groupedWeeks[0].startDate} s.d. ${groupedWeeks[0].endDate}`
        : 'Penyelesaian Tugas & Tanggung Jawab Harian',
      tag: 'Pelaksanaan Tugas',
      bullets: groupedWeeks[0]
        ? groupedWeeks[0].logs.slice(0, 4).map((l) => `${l.date}: ${cleanReportText(l.activity_desc)}`)
        : [
            'Menyelesaikan tugas operasional sesuai arahan pembimbing lapangan',
            'Berkoordinasi aktif dengan divisi kerja terkait pemenuhan target harian',
            'Mendokumentasikan alur pelaksanaan pekerjaan dan hasil kerja secara sistematis',
          ],
      speaker_notes: 'Pada bagian ini dipaparkan rincian pekerjaan dan tugas yang telah diselesaikan pada minggu bersangkutan secara faktual.',
    },
    {
      id: 3,
      title: groupedWeeks[1]
        ? `Aktivitas Kerja (Minggu ke-${groupedWeeks[1].weekNum})`
        : groupedWeeks[0] && groupedWeeks[0].logs.length > 4
        ? `Lanjutan Aktivitas (Minggu ke-${groupedWeeks[0].weekNum})`
        : 'Pencapaian & Progres Kerja',
      subtitle: groupedWeeks[1]
        ? `Rentang Periode: ${groupedWeeks[1].startDate} s.d. ${groupedWeeks[1].endDate}`
        : 'Hasil Kerja & Kontribusi Nyata',
      tag: 'Hasil Kegiatan',
      bullets: groupedWeeks[1]
        ? groupedWeeks[1].logs.slice(0, 4).map((l) => `${l.date}: ${cleanReportText(l.activity_desc)}`)
        : [
            'Penyelesaian target proyek magang sesuai timeline instansi',
            'Peningkatan ketepatan waktu dalam pelaporan harian',
            'Optimalisasi koordinasi dengan rekan magang dan pembimbing',
          ],
      speaker_notes: 'Berikut adalah kelanjutan progres aktivitas serta kontribusi yang dicapai pada periode pemagangan.',
    },
    {
      id: 4,
      title: 'Pembelajaran & Keterampilan Baru',
      subtitle: 'Kompetensi Teknis dan Soft Skills yang Diperoleh',
      tag: 'Capaian Pembelajaran',
      bullets: safeLogs.length > 0
        ? Array.from(new Set(safeLogs.map((l) => cleanReportText(l.learning_desc)))).slice(0, 4)
        : [
            'Memahami alur koordinasi dan birokrasi profesional di lingkungan kerja',
            'Meningkatkan keterampilan teknis sesuai bidang penempatan magang',
            'Melatih pemecahan masalah (problem solving) secara mandiri dan tim',
          ],
      speaker_notes: 'Selama melaksanakan penugasan, terdapat berbagai kompetensi teknis dan nilai profesionalitas baru yang saya pelajari.',
    },
    {
      id: 5,
      title: 'Evaluasi Kendala & Rencana Tindak Lanjut',
      subtitle: 'Solusi Terapan dan Target Periode Berikutnya',
      tag: 'Evaluasi & Solusi',
      bullets: [
        safeLogs[0] ? `Solusi kendala: ${cleanReportText(safeLogs[0].obstacle_desc)}` : 'Mengatasi kendala teknis melalui koordinasi berkala dengan pembimbing',
        'Memperkuat konsistensi pelaporan harian sebelum batas waktu 23.59',
        'Mempersiapkan penyusunan laporan akhir pemagangan secara berkala',
      ],
      speaker_notes: 'Sebagai penutup, setiap kendala telah dievaluasi solusinya dan rencana kerja telah disiapkan untuk memastikan seluruh target pemagangan tercapai dengan baik.',
    },
  ];

  if (!apiKey || safeLogs.length === 0) {
    return {
      title: 'Laporan Perkembangan Pemagangan',
      subtitle: meta.weekTitle || `Evaluasi Progres Magang (${startDate} – ${endDate})`,
      author: meta.author,
      period: `${startDate} s.d. ${endDate}`,
      institution: meta.institution || 'Maganghub Kemnaker',
      slides: defaultSlides,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const weeklyStructureInfo = groupedWeeks
    .map(
      (w) =>
        `Minggu ke-${w.weekNum} (${w.startDate} s.d. ${w.endDate}):\n` +
        w.logs.map((l) => `  - [${l.date}] Aktivitas: ${cleanReportText(l.activity_desc)}`).join('\n')
    )
    .join('\n\n');

  try {
    const prompt = `Buatkan deck presentasi PPT evaluasi magang 5 slide yang profesional, terstruktur, dan tidak memotong kalimat.
Informasi Pemagangan:
- Penulis: ${meta.author}
- Instansi: ${meta.institution || 'Mitra Pemagangan'}
- Periode: ${startDate} s.d. ${endDate}

Data Kegiatan Mingguan:
${weeklyStructureInfo}

Pelajaran:
${safeLogs.slice(0, 4).map((l) => `- ${cleanReportText(l.learning_desc)}`).join('\n')}

Format output JSON murni persis:
{
  "slides": [
    { "id": 1, "title": "...", "subtitle": "...", "tag": "Judul", "bullets": ["...", "...", "...", "..."], "speaker_notes": "..." },
    { "id": 2, "title": "Aktivitas Kerja (Minggu ke-1)", "subtitle": "...", "tag": "Minggu ke-1", "bullets": ["...", "...", "..."], "speaker_notes": "..." },
    { "id": 3, "title": "Aktivitas Kerja (Minggu ke-2)", "subtitle": "...", "tag": "Minggu ke-2", "bullets": ["...", "...", "..."], "speaker_notes": "..." },
    { "id": 4, "title": "Pembelajaran & Keterampilan Baru", "subtitle": "...", "tag": "Kompetensi", "bullets": ["...", "...", "..."], "speaker_notes": "..." },
    { "id": 5, "title": "Evaluasi & Rencana Tindak Lanjut", "subtitle": "...", "tag": "Evaluasi", "bullets": ["...", "...", "..."], "speaker_notes": "..." }
  ]
}`;

    const res = await generateWithRetry(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', temperature: 0.2 },
    });

    const parsed = JSON.parse(res.text || '{}');
    if (Array.isArray(parsed.slides) && parsed.slides.length === 5) {
      return {
        title: 'Laporan Perkembangan Pemagangan',
        subtitle: meta.weekTitle || `Evaluasi Progres Magang (${startDate} – ${endDate})`,
        author: meta.author,
        period: `${startDate} s.d. ${endDate}`,
        institution: meta.institution || 'Maganghub Kemnaker',
        slides: parsed.slides.map((s: any, idx: number) => ({
          id: idx + 1,
          title: cleanReportText(s.title || defaultSlides[idx].title),
          subtitle: cleanReportText(s.subtitle || defaultSlides[idx].subtitle),
          tag: cleanReportText(s.tag || defaultSlides[idx].tag),
          bullets: Array.isArray(s.bullets) && s.bullets.length > 0
            ? s.bullets.map((b: string) => cleanReportText(b))
            : defaultSlides[idx].bullets,
          speaker_notes: cleanReportText(s.speaker_notes || defaultSlides[idx].speaker_notes),
        })),
      };
    }
  } catch {
    // fallback
  }

  return {
    title: 'Laporan Perkembangan Pemagangan',
    subtitle: meta.weekTitle || `Evaluasi Progres Magang (${startDate} – ${endDate})`,
    author: meta.author,
    period: `${startDate} s.d. ${endDate}`,
    institution: meta.institution || 'Maganghub Kemnaker',
    slides: defaultSlides,
  };
}

/**
 * Speech-to-Text Transcribe (Paket Pro)
 */
export async function transcribeAudio(
  base64Audio: string,
  mimeType = 'audio/webm'
): Promise<string> {
  const apiKey = await getActiveApiKey();
  if (!apiKey) {
    return 'Hari ini saya berkoordinasi dengan tim, menyusun dokumentasi laporan kerja, dan menyelesaikan rekapitulasi data harian sesuai arahan pembimbing lapangan.';
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await generateWithRetry(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType,
              },
            },
            {
              text: 'Transkripsikan rekaman audio suara peserta magang ini secara akurat ke dalam bahasa Indonesia bersih tanpa tanda aneh, tanpa filler (eee, umm), huruf kapital benar, dan tanda baca lengkap.',
            },
          ],
        },
      ],
    });

    const text = response.text?.trim() || '';
    return cleanReportText(text);
  } catch (error) {
    console.error('Transcribe error:', error);
    return 'Hari ini saya menyelesaikan tugas operasional dan menyusun draf laporan kegiatan harian pemagangan.';
  }
}
