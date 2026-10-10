import { calculateJaccardSimilarity, checkSimilarityWithHistory } from '../../lib/ai/jaccard';

export function runJaccardTests() {
  console.log('--- MENJALANKAN TEST UNIT JACCARD SIMILARITY ---');

  // Test 1: Teks identik harus bernilai 1.0
  const textA = 'Melakukan perbaikan bug pada modul absensi pemagangan nasional';
  const scoreIdentical = calculateJaccardSimilarity(textA, textA);
  if (scoreIdentical < 0.99) {
    throw new Error(`Test 1 Gagal: Kemiripan teks identik harus 1.0, didapat: ${scoreIdentical}`);
  }
  console.log('✓ Test 1 Lolos: Teks identik bernilai 1.0');

  // Test 2: Teks berbeda total harus mendekati 0
  const textB = 'Memasak bumbu marinasi ayam untuk prasmanan hotel';
  const scoreDifferent = calculateJaccardSimilarity(textA, textB);
  if (scoreDifferent > 0.3) {
    throw new Error(`Test 2 Gagal: Teks berbeda harus rendah, didapat: ${scoreDifferent}`);
  }
  console.log('✓ Test 2 Lolos: Teks berbeda memiliki skor rendah (< 0.3)');

  // Test 3: Deteksi kemiripan riwayat > 0.6
  const draft = {
    activity_desc: 'Melakukan penelusuran dan perbaikan bug absensi di server',
    learning_desc: 'Memahami cara perbaikan bug absensi di server',
    obstacle_desc: 'Kendala pada modul absensi di server',
  };
  const history = [
    {
      activity_desc: 'Melakukan penelusuran dan perbaikan bug absensi di server',
      learning_desc: 'Memahami cara perbaikan bug absensi di server',
      obstacle_desc: 'Kendala pada modul absensi di server',
    },
  ];
  const simCheck = checkSimilarityWithHistory(draft, history);
  if (!simCheck.isTooSimilar) {
    throw new Error('Test 3 Gagal: Kemiripan tinggi harus memicu isTooSimilar = true');
  }
  console.log('✓ Test 3 Lolos: Peringatan kemiripan tinggi terpicu (> 0.6)');
}
