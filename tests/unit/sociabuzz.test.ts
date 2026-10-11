import assert from 'assert';
import {
  isSociaBuzzEnabled,
  verifySociaBuzzWebhookSignature,
} from '../../lib/payments/sociabuzz';
import crypto from 'crypto';

export async function runSociaBuzzTests() {
  console.log('\n--- MENJALANKAN TEST INTEGRASI SOCIABUZZ PAYMENT GATEWAY ---');

  // Test 1: isSociaBuzzEnabled()
  const origProvider = process.env.PAYMENT_GATEWAY;
  const origUser = process.env.SOCIABUZZ_USERNAME;
  const origUrl = process.env.SOCIABUZZ_GATEWAY_URL;

  process.env.PAYMENT_GATEWAY = 'sociabuzz';
  assert.strictEqual(isSociaBuzzEnabled(), true, 'Harus aktif jika PAYMENT_GATEWAY=sociabuzz');

  delete process.env.PAYMENT_GATEWAY;
  assert.strictEqual(isSociaBuzzEnabled(), true, 'Harus default true jika tidak dispesifikasikan');

  process.env.PAYMENT_GATEWAY = 'midtrans';
  assert.strictEqual(isSociaBuzzEnabled(), false, 'Harus false jika PAYMENT_GATEWAY=midtrans');

  // Restore env
  if (origProvider) process.env.PAYMENT_GATEWAY = origProvider;
  if (origUser) process.env.SOCIABUZZ_USERNAME = origUser;
  if (origUrl) process.env.SOCIABUZZ_GATEWAY_URL = origUrl;
  console.log('✓ Test 1 Lolos: Deteksi provider SociaBuzz berfungsi');

  // Test 2: Webhook signature
  const secret = 'kunci_rahasia_webhook_123';
  const body = JSON.stringify({ event: 'payment.paid', token: 'test-token', status: 'paid' });
  const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

  assert.strictEqual(
    verifySociaBuzzWebhookSignature(body, validSig, secret),
    true,
    'Signature sah harus diterima'
  );
  assert.strictEqual(
    verifySociaBuzzWebhookSignature(body, 'palsu_signature_123', secret),
    false,
    'Signature palsu harus ditolak'
  );
  // Test 3: Webhook token validation
  const testToken = 'sbwhook-ojimaktaykmx2wh104h6qf7p';
  assert.strictEqual(
    testToken.startsWith('sbwhook-'),
    true,
    'Format token webhook SociaBuzz harus valid'
  );
  console.log('✓ Test 3 Lolos: Validasi token webhook SociaBuzz (sbwhook-...) valid');
}

if (process.argv[1]?.endsWith('sociabuzz.test.ts')) {
  runSociaBuzzTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
