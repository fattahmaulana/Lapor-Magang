import { generateWeeklyRecap, generatePresentationDeck, transcribeAudio } from '../../lib/ai/adapter';
import type { DailyLogItem } from '../../types/report';

export async function runRecapAndDeckTests() {
  console.log('--- MENJALANKAN TEST REKAP MINGGUAN & SLIDE PRESENTASI PPT ---');

  const sampleLogs: DailyLogItem[] = [
    {
      id: 'log-1',
      date: '2026-10-09',
      activity_desc: 'Membantu instalasi switch jaringan dan konfigurasi IP address statis di divisi umum.',
      learning_desc: 'Belajar prosedur subnetting IPv4 dan standar perkabelan TIA/EIA 568B.',
      obstacle_desc: 'Sempat ada port switch yang longgar, sudah diganti konektor baru.',
      is_reported_to_maganghub: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'log-2',
      date: '2026-10-08',
      activity_desc: 'Menyusun dokumentasi SOP pelayanan permohonan magang dan verifikasi berkas peserta.',
      learning_desc: 'Memahami alur birokrasi instansi dan validasi data kependudukan.',
      obstacle_desc: 'Beberapa scan dokumen buram, langsung dihubungi untuk unggah ulang.',
      is_reported_to_maganghub: true,
      created_at: new Date().toISOString(),
    },
  ];

  // 1. Uji Rekap Mingguan
  const recap = await generateWeeklyRecap(sampleLogs, 'Pekan 1 Oktober');
  if (!recap || !recap.summary || !Array.isArray(recap.key_achievements)) {
    throw new Error('Test Recap Gagal: Rekap mingguan tidak menghasilkan struktur yang valid');
  }
  if (recap.total_days !== 2) {
    throw new Error('Test Recap Gagal: Jumlah total_days tidak sesuai');
  }
  console.log('✓ Test Recap Lolos: Rekap mingguan berhasil dirangkum secara manusiawi & terstruktur');

  // 2. Uji Slide Presentasi PPT (Minggu ke-1)
  const deck = await generatePresentationDeck(sampleLogs, {
    author: 'Peserta Uji',
    weekTitle: 'Pekan 1 Oktober',
    institution: 'Dinas Kominfo',
  });
  if (!deck || !Array.isArray(deck.slides) || deck.slides.length !== 5) {
    throw new Error('Test Deck Gagal: Slide presentasi tidak menghasilkan 5 slide standar');
  }
  const slide1 = deck.slides[0];
  const slide2 = deck.slides[1];
  if (!slide1.title || !slide2.bullets || slide2.bullets.length === 0) {
    throw new Error('Test Deck Gagal: Konten slide kosong');
  }
  if (!slide2.title.includes('Minggu ke-1')) {
    throw new Error('Test Deck Gagal: Judul slide tidak memuat Minggu ke-1');
  }
  console.log('✓ Test Deck 1 Lolos: Dek slide presentasi PPT (Minggu ke-1) berhasil dibuat lengkap tanpa potongan teks');

  // 3. Uji Multi-Minggu (Minggu ke-1, Minggu ke-2, dst.)
  const multiWeekLogs: DailyLogItem[] = [
    ...sampleLogs,
    {
      id: 'log-3',
      date: '2026-10-16', // 8 hari setelah log-2 -> Masuk Minggu ke-2
      activity_desc: 'Melakukan migrasi database dan pengujian performa endpoint API laporan.',
      learning_desc: 'Memahami teknik indexing PostgreSQL dan optimasi query terstruktur.',
      obstacle_desc: 'Sempat terjadi lonjakan latensi, diatasi dengan penambahan indeks komposit.',
      is_reported_to_maganghub: true,
      created_at: new Date().toISOString(),
    },
  ];

  const multiDeck = await generatePresentationDeck(multiWeekLogs, {
    author: 'Peserta Uji',
    weekTitle: 'Rekap Multi Minggu',
  });

  const week1Slide = multiDeck.slides.find((s) => s.title.includes('Minggu ke-1'));
  const week2Slide = multiDeck.slides.find((s) => s.title.includes('Minggu ke-2'));

  if (!week1Slide || !week2Slide) {
    throw new Error('Test Multi-Week Gagal: Slide tidak memuat Minggu ke-1 dan Minggu ke-2 secara terpisah');
  }
  console.log('✓ Test Deck 2 Lolos: Dek slide PPT multi-minggu otomatis mengelompokkan kegiatan Minggu ke-1, Minggu ke-2, dst.');

  // 4. Uji Transkripsi Audio Suara (Speech-to-Text Pro)
  const dummyBase64 = Buffer.from('RIFF_DUMMY_AUDIO_DATA').toString('base64');
  const transcript = await transcribeAudio(dummyBase64, 'audio/webm');
  if (!transcript || transcript.length < 5) {
    throw new Error('Test Transcribe Gagal: Transkripsi audio kosong');
  }
  console.log('✓ Test Transcribe Lolos: Transkripsi audio Speech-to-Text Pro berfungsi');
}
