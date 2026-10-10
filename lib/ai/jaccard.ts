/**
 * Trigram Jaccard Similarity Calculator
 * Membandingkan kemiripan teks dengan 7 laporan terakhir untuk mendeteksi repetisi draf.
 */

function generateTrigrams(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const trigrams = new Set<string>();
  if (normalized.length < 3) {
    if (normalized.length > 0) trigrams.add(normalized);
    return trigrams;
  }
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.slice(i, i + 3));
  }
  return trigrams;
}

export function calculateJaccardSimilarity(textA: string, textB: string): number {
  const setA = generateTrigrams(textA);
  const setB = generateTrigrams(textB);

  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  return unionSize === 0 ? 0 : intersectionCount / unionSize;
}

export function checkSimilarityWithHistory(
  newDraft: { activity_desc: string; learning_desc: string; obstacle_desc: string },
  history: Array<{ activity_desc: string; learning_desc: string; obstacle_desc: string }>
): { maxSimilarity: number; isTooSimilar: boolean } {
  if (!history || history.length === 0) {
    return { maxSimilarity: 0, isTooSimilar: false };
  }

  const newCombined = `${newDraft.activity_desc} ${newDraft.learning_desc} ${newDraft.obstacle_desc}`;
  let maxScore = 0;

  for (const item of history.slice(0, 7)) {
    const pastCombined = `${item.activity_desc} ${item.learning_desc} ${item.obstacle_desc}`;
    const score = calculateJaccardSimilarity(newCombined, pastCombined);
    if (score > maxScore) {
      maxScore = score;
    }
  }

  return {
    maxSimilarity: Math.round(maxScore * 100) / 100,
    isTooSimilar: maxScore > 0.6,
  };
}
