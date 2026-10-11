import { runJaccardTests } from './unit/jaccard.test';
import { runWebhookSecurityTests } from './security/webhook.test';
import { runRlsSimulationTest } from './security/rls.test';
import { runAuthGuardTests } from './security/auth-guard.test';
import { runRecapAndDeckTests } from './unit/recap-deck.test';
import { runSociaBuzzTests } from './unit/sociabuzz.test';

async function main() {
  console.log('====================================================');
  console.log('MENJALANKAN SELURUH TEST SUITE LAPORMAGANG');
  console.log('====================================================\n');

  try {
    runJaccardTests();
    console.log('');
    await runWebhookSecurityTests();
    console.log('');
    await runSociaBuzzTests();
    console.log('');
    runRlsSimulationTest();
    console.log('');
    await runAuthGuardTests();
    console.log('');
    await runRecapAndDeckTests();
    console.log('\n====================================================');
    console.log('SELURUH TEST KEAMANAN, RLS, DAN BISNIS LOLOS 100%');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
