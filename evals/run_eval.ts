import fs from 'fs';
import path from 'path';
import { generateReport } from '../lib/ai/adapter';
import { reportDraftSchema } from '../lib/ai/adapter';

async function runEvaluation() {
  console.log('--- MEMULAI EVALUASI 30 CATATAN UJI LAPORMAGANG ---');
  const filePath = path.join(process.cwd(), 'evals', 'test_cases.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const testCases = JSON.parse(rawData);

  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const item = testCases[i];
    const result = await generateReport({ notes: item.note });

    if (result.status !== 'success') {
      console.error(`[FAIL] ${item.id} (${item.domain}): Status bukan success (${result.status})`);
      failedCount++;
      continue;
    }

    const { activity_desc, learning_desc, obstacle_desc } = result.data;
    const validated = reportDraftSchema.safeParse(result.data);

    if (!validated.success) {
      console.error(`[FAIL] ${item.id} (${item.domain}): Validasi Zod gagal:`, validated.error.issues);
      failedCount++;
      continue;
    }

    // Periksa batasan panjang kolom (120 - 400 karakter)
    const isActValid = activity_desc.length >= 120 && activity_desc.length <= 400;
    const isLearnValid = learning_desc.length >= 120 && learning_desc.length <= 400;
    const isObsValid = obstacle_desc.length >= 120 && obstacle_desc.length <= 400;

    if (!isActValid || !isLearnValid || !isObsValid) {
      console.error(
        `[FAIL] ${item.id} (${item.domain}): Batas karakter tidak valid -> Act: ${activity_desc.length}, Learn: ${learning_desc.length}, Obs: ${obstacle_desc.length}`
      );
      failedCount++;
      continue;
    }

    passedCount++;
    console.log(
      `[PASS] ${item.id} (${item.domain}) -> Act: ${activity_desc.length}c, Learn: ${learning_desc.length}c, Obs: ${obstacle_desc.length}c`
    );
  }

  console.log('----------------------------------------------------');
  console.log(`TOTAL UJI: ${testCases.length} | LULUS: ${passedCount} | GAGAL: ${failedCount}`);
  console.log(`TINGKAT KELULUSAN: ${Math.round((passedCount / testCases.length) * 100)}%`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEvaluation().catch((err) => {
  console.error('Fatal evaluation error:', err);
  process.exit(1);
});
