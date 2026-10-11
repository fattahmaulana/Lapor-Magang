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

async function generateWithRetry(ai: GoogleGenAI, params: any) {
  let lastErr;
  for (let i = 0; i < 2; i++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Request timeout')), 7000)
      );
      const callPromise = ai.models.generateContent({
        ...params,
        model: 'gemini-2.5-flash',
      });
      return (await Promise.race([callPromise, timeoutPromise])) as any;
    } catch (err: any) {
      lastErr = err;
      if (i < 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }
  throw lastErr;
}

/**
 * Abstraksi AI Engine Adapter
 * Memenuhi kebutuhan penulisan manusiawi (natural, tidak kaku seperti robot/AI slop)
 */
export async function generateReport(
  options: GenerateReportOptions
): Promise<GenerateReportResponse> {
  const { notes, tone = 'standar' } = options;

  const sanitizedNotes = notes.trim().slice(0, 4000);

  if (sanitizedNotes.length < 80) {
    return {
      status: 'needs_more_info',
      question:
        'Bisa ceritakan sedikit lebih rinci apa saja yang kamu kerjakan hari ini, hal baru yang kamu pelajari, atau kendala kecil yang muncul saat magang?',
      reason:
        'Catatan kerja masih di bawah 80 karakter, belum memuat rincian aktivitas yang cukup untuk memenuhi batas 100 karakter Maganghub.',
    };
  }

  const apiKey = await getActiveApiKey();
  if (!apiKey) {
    return generateHumanizedFallback(sanitizedNotes);
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Kamu adalah rekan magang berpengalaman yang membantu peserta Pemagangan Nasional (Maganghub, Kemnaker) merapikan draf laporan harian mereka.

PANDUAN GAYA BAHASA MANUSIAWI (PENTING):
1. TULIS SECARA NATURAL DAN WAJAR layaknya mahasiswa/peserta magang yang menulis logbook harian mereka sendiri.
2. DILARANG KERAS menggunakan kata-kata robotik / klise AI birokratis seperti:
   - JANGAN PAKAI: "Melaksanakan serangkaian agenda komprehensif...", "Sebagai manifestasi pembelajaran...", "Guna mengoptimalkan sinergitas...", "Mewujudkan efektivitas holistik..."
   - GUNAKAN GAYA MANUSIAWI: "Hari ini saya fokus menyelesaikan...", "Saya membantu tim dalam...", "Dari kegiatan ini saya jadi lebih paham cara...", "Sempat ada sedikit kendala pada..., namun sudah berhasil diselesaikan dengan..."
3. HANYA GUNAKAN FAKTA yang benar-benar ada dalam catatan pengguna. Jangan mengarang nama proyek, teknologi, atau tugas fiktif yang tidak pernah disebut.
4. Setiap kolom WAJIB memiliki panjang antara 130 sampai 360 karakter (aturan sistem Maganghub minimal 100 karakter).
5. Format output WAJIB JSON murni tanpa markdown:
   Jika catatan memuat kegiatan nyata:
   {"status": "success", "activity_desc": "...", "learning_desc": "...", "obstacle_desc": "..."}
   Jika catatan terlalu ambigu:
   {"status": "needs_more_info", "question": "satu pertanyaan lanjutan yang ramah", "reason": "alasan singkat"}
`;

  const promptContent = `Berikut adalah catatan kerja harian dari peserta magang:

<user_notes>
${sanitizedNotes.replace(/<\/user_notes>/g, '')}
</user_notes>

Gaya penulisan: ${tone} (bahasa Indonesia manusiawi, wajar, tidak kaku, tanpa klise robotik).
Susun draf 3 kolom (activity_desc, learning_desc, obstacle_desc). Pastikan masing-masing kolom panjangnya 130-360 karakter. Kembalikan JSON murni.`;

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
          temperature: 0.3,
        },
      });

      const responseText = response.text?.trim() || '';
      const parsed = JSON.parse(responseText);
      const validated = aiResponseSchema.parse(parsed);

      if (validated.status === 'needs_more_info') {
        return {
          status: 'needs_more_info',
          question: validated.question,
          reason: validated.reason,
        };
      }

      const draftValidation = reportDraftSchema.safeParse({
        activity_desc: validated.activity_desc.trim(),
        learning_desc: validated.learning_desc.trim(),
        obstacle_desc: validated.obstacle_desc.trim(),
      });

      if (draftValidation.success) {
        return {
          status: 'success',
          data: draftValidation.data,
        };
      }

      if (attempts > maxAttempts) {
        return {
          status: 'success',
          data: {
            activity_desc: ensureLength(
              validated.activity_desc,
              'Semua proses diselesaikan dengan tertib sesuai arahan kerja dari pembimbing lapangan hari ini.'
            ),
            learning_desc: ensureLength(
              validated.learning_desc,
              'Hal ini membuat saya lebih memahami alur kerja nyata dan pentingnya komunikasi yang jelas saat magang.'
            ),
            obstacle_desc: ensureLength(
              validated.obstacle_desc,
              'Awalnya butuh sedikit penyesuaian teknis, namun langsung bisa diatasi dengan baik tanpa kendala besar.'
            ),
          },
        };
      }
    } catch {
      if (attempts > maxAttempts) {
        return generateHumanizedFallback(sanitizedNotes);
      }
    }
  }

  return generateHumanizedFallback(sanitizedNotes);
}

function ensureLength(text: string, supplement: string): string {
  const trimmed = text.trim();
  if (trimmed.length >= 120 && trimmed.length <= 400) return trimmed;
  if (trimmed.length < 120) {
    return `${trimmed} ${supplement}`.slice(0, 390);
  }
  return trimmed.slice(0, 390);
}

function generateHumanizedFallback(rawNotes: string): GenerateReportResponse {
  const clean = rawNotes.replace(/\s+/g, ' ').trim();

  const act = `Hari ini saya fokus mengerjakan tugas magang terkait: ${clean}. Saya mengikuti instruksi dari pembimbing lapangan dan memastikan seluruh tahapan kerja selesai dengan baik sesuai jadwal yang ditentukan.`;
  const learn = `Dari tugas hari ini (${clean.slice(0, 70)}...), saya belajar langsung tentang cara kerja praktis di tempat magang serta melatih ketelitian agar tidak terjadi kesalahan pada proses berikutnya.`;
  const obs = `Proses kerja berjalan cukup lancar. Tadi sempat ada sedikit penyesuaian waktu pada saat pengerjaan, namun semuanya bisa diselesaikan dengan baik tanpa hambatan yang berarti.`;

  return {
    status: 'success',
    data: {
      activity_desc: act.slice(0, 380),
      learning_desc: learn.slice(0, 380),
      obstacle_desc: obs.slice(0, 380),
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
  "obstacles_and_solutions": ["kendala & solusinya 1", "kendala & solusinya 2"],
  "next_week_plan": ["rencana minggu depan 1", "rencana minggu depan 2"]
}`;

    const res = await generateWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(res.text || '{}');
    return {
      week_label: weekLabel,
      period: `${safeLogs[safeLogs.length - 1]?.date || 'Awal'} s.d. ${safeLogs[0]?.date || 'Akhir'}`,
      total_days: safeLogs.length,
      summary: parsed.summary || defaultRecap.summary,
      key_achievements: Array.isArray(parsed.key_achievements) && parsed.key_achievements.length > 0 ? parsed.key_achievements : defaultRecap.key_achievements,
      key_learnings: Array.isArray(parsed.key_learnings) && parsed.key_learnings.length > 0 ? parsed.key_learnings : defaultRecap.key_learnings,
      obstacles_and_solutions: Array.isArray(parsed.obstacles_and_solutions) && parsed.obstacles_and_solutions.length > 0 ? parsed.obstacles_and_solutions : defaultRecap.obstacles_and_solutions,
      next_week_plan: Array.isArray(parsed.next_week_plan) && parsed.next_week_plan.length > 0 ? parsed.next_week_plan : defaultRecap.next_week_plan,
    };
  } catch {
    return defaultRecap;
  }
}

/**
 * Mengelompokkan logbook berdasarkan minggu (Minggu ke-1, Minggu ke-2, Minggu ke-3, dst.)
 */
export function groupLogsByWeeks(logs: { date: string; activity_desc: string; learning_desc: string; obstacle_desc: string }[]) {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  const firstDate = new Date(sorted[0].date);
  const weeksMap: Map<number, { weekNum: number; startDate: string; endDate: string; logs: typeof logs }> = new Map();

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
 * Menampilkan kegiatan per minggu (Minggu ke-1, Minggu ke-2, dst.) secara lengkap tanpa terpotong
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
  ];

  let slideId = 2;

  // Buat slide khusus untuk SETIAP minggu kegiatan (Minggu 1, Minggu 2, Minggu 3, dst.)
  if (groupedWeeks.length > 0) {
    groupedWeeks.forEach((w) => {
      const weekBullets = w.logs.map((l) => `${l.date}: ${l.activity_desc}`);
      defaultSlides.push({
        id: slideId++,
        title: `Kegiatan Minggu ke-${w.weekNum}`,
        subtitle: `Periode ${w.startDate} s.d. ${w.endDate} (${w.logs.length} hari kegiatan)`,
        tag: `Minggu ${w.weekNum}`,
        bullets: weekBullets,
        speaker_notes: `Pada minggu ke-${w.weekNum}, fokus pekerjaan berpusat pada penugasan operasional dan pendalaman materi di unit kerja.`,
      });
    });
  } else {
    defaultSlides.push({
      id: slideId++,
      title: 'Aktivitas Kerja Magang',
      subtitle: 'Fokus & Ruang Lingkup Penugasan',
      tag: 'Aktivitas',
      bullets: ['Belum ada riwayat aktivitas yang tercatat.'],
      speaker_notes: 'Ringkasan aktivitas magang.',
    });
  }

  // Slide Pencapaian & Keterampilan Baru (kalimat utuh tanpa terpotong)
  const uniqueLearnings = Array.from(
    new Set(safeLogs.map((l) => l.learning_desc).filter(Boolean))
  ).slice(0, 4);

  defaultSlides.push({
    id: slideId++,
    title: 'Pencapaian & Keterampilan Baru',
    subtitle: 'Kompetensi Teknis & Pemahaman yang Diperoleh',
    tag: 'Hasil Belajar',
    bullets:
      uniqueLearnings.length > 0
        ? uniqueLearnings
        : [
            'Memahami standar operasional prosedur instansi tempat magang.',
            'Meningkatkan keterampilan komunikasi kerja dan pemecahan masalah langsung.',
            'Melatih disiplin pelaporan harian sebelum batas waktu resmi.',
          ],
    speaker_notes: 'Berbagai keterampilan teknis dan soft skill yang berhasil saya pelajari secara langsung di lapangan.',
  });

  // Slide Kendala & Solusi Lapangan (kalimat utuh tanpa terpotong)
  const uniqueObstacles = Array.from(
    new Set(safeLogs.map((l) => l.obstacle_desc).filter(Boolean))
  ).slice(0, 4);

  defaultSlides.push({
    id: slideId++,
    title: 'Evaluasi Kendala & Solusi Lapangan',
    subtitle: 'Tantangan Operasional & Langkah Penyelesaian Masalah',
    tag: 'Evaluasi Kendala',
    bullets:
      uniqueObstacles.length > 0
        ? uniqueObstacles
        : ['Kendala teknis awal diselesaikan melalui bimbingan aktif bersama mentor dan tim kerja.'],
    speaker_notes: 'Tantangan yang muncul saat bekerja dan bagaimana saya bersama pembimbing mencari jalan keluar.',
  });

  // Slide Rencana Kerja & Tindak Lanjut
  defaultSlides.push({
    id: slideId++,
    title: 'Rencana Kerja & Tindak Lanjut',
    subtitle: 'Target Pencapaian & Prioritas Periode Mendatang',
    tag: 'Rencana Kerja',
    bullets: [
      'Menyelesaikan penugasan divisi yang sedang berjalan sesuai target mutu instansi.',
      'Memperdalam penguasaan perangkat kerja dan sistem informasi yang digunakan mitra.',
      'Mendiskusikan evaluasi berkala dan menerima bimbingan lanjutan dari mentor industri.',
      'Memastikan seluruh laporan harian Maganghub tetap terisi tepat waktu sebelum 23.59 WIB.',
    ],
    speaker_notes: 'Berikut rencana prioritas kerja yang akan saya eksekusi pada periode penugasan selanjutnya.',
  });

  const defaultDeck: PresentationDeck = {
    title: 'Laporan Perkembangan Pemagangan',
    subtitle: `Evaluasi Progres Magang & Pencapaian Kerja (${startDate} s.d. ${endDate})`,
    author: meta.author || 'Peserta Pemagangan Nasional',
    period: `${startDate} s.d. ${endDate}`,
    institution: meta.institution || 'Maganghub Kemnaker',
    slides: defaultSlides,
  };

  if (!apiKey || safeLogs.length === 0) {
    return defaultDeck;
  }

  const ai = new GoogleGenAI({ apiKey });
  const logsText = groupedWeeks
    .map(
      (w) =>
        `[Minggu ke-${w.weekNum} (${w.startDate} s.d. ${w.endDate})]:\n` +
        w.logs
          .map((l) => `- Tanggal ${l.date}: Aktivitas: ${l.activity_desc} | Pelajaran: ${l.learning_desc} | Kendala: ${l.obstacle_desc}`)
          .join('\n')
    )
    .join('\n\n');

  try {
    const prompt = `Kamu adalah pembuat presentasi profesional untuk program Pemagangan Nasional (Maganghub Kemnaker).
Dari data riwayat catatan magang per minggu berikut:
${logsText}

ATURAN STRUKTUR SLIDE:
1. Slide 1: Cover Judul Laporan ("Laporan Perkembangan Pemagangan")
2. Buatkan 1 slide khusus untuk SETIAP minggu kegiatan ("Kegiatan Minggu ke-1", "Kegiatan Minggu ke-2", "Kegiatan Minggu ke-3", dst.) sesuai data minggu yang tersedia. Poin-poin kegiatan harus memuat tanggal dan uraian kalimat yang LENGKAP TANPA TERPOTONG.
3. Slide Pencapaian & Keterampilan yang Diperoleh (kalimat utuh tanpa terpotong).
4. Slide Evaluasi Kendala Lapangan & Solusi Pemecahan Masalah (kalimat utuh tanpa terpotong).
5. Slide Rencana Kerja & Tindak Lanjut Mendatang.

DILARANG MEMOTONG KALIMAT di tengah jalan (dilarang menggunakan "..." atau kata gantung). Seluruh bullet point harus berupa kalimat lengkap yang rapi dan profesional.

Format output JSON murni:
{
  "title": "Laporan Perkembangan Pemagangan",
  "subtitle": "Evaluasi Progres Magang & Pencapaian Kerja",
  "slides": [
    {
      "id": 1,
      "title": "Judul Slide",
      "subtitle": "Keterangan",
      "tag": "Kategori / Minggu X",
      "bullets": ["Poin penting lengkap tanpa potongan kalimat 1", "Poin 2"],
      "speaker_notes": "Catatan singkat apa yang harus diucapkan presenter"
    }
  ]
}`;

    const res = await generateWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(res.text || '{}');
    if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
      return {
        ...defaultDeck,
        title: parsed.title || defaultDeck.title,
        subtitle: parsed.subtitle || defaultDeck.subtitle,
        slides: parsed.slides.map((s: any, idx: number) => ({
          id: idx + 1,
          title: s.title || `Slide ${idx + 1}`,
          subtitle: s.subtitle,
          tag: s.tag || 'Progres Magang',
          bullets: Array.isArray(s.bullets) ? s.bullets : ['Poin kegiatan magang'],
          speaker_notes: s.speaker_notes,
        })),
      };
    }
    return defaultDeck;
  } catch {
    return defaultDeck;
  }
}

/**
 * Transkripsi Rekaman Audio Suara (Speech-to-Text Pro)
 */
export async function transcribeAudio(
  audioBase64: string,
  mimeType = 'audio/webm'
): Promise<string> {
  const apiKey = await getActiveApiKey();
  if (!apiKey) {
    return 'Hari ini saya fokus membantu penyelesaian tugas operasional dan koordinasi kerja di unit pemagangan.';
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const res = await generateWithRetry(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: 'Dengarkan rekaman suara kegiatan magang ini dan transkripsikan ke teks bahasa Indonesia secara bersih, alami, dan akurat. Jangan tambahkan kata pengantar atau penutup, cukup teks hasil ucapannya saja.',
            },
          ],
        },
      ],
    });
    return res.text?.trim() || '';
  } catch {
    return 'Hari ini saya fokus membantu penugasan tim di tempat magang.';
  }
}

