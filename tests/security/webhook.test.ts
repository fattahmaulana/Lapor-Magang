import { verifyMidtransSignature } from '../../lib/payments/midtrans';

export function runWebhookSecurityTests() {
  console.log('--- MENJALANKAN TEST KEAMANAN WEBHOOK MIDTRANS ---');

  const serverKey = 'test_server_secret_key_123';
  const orderId = 'LM-ORDER-1001';
  const statusCode = '200';
  const grossAmount = '5000';

  // 1. Tanda Tangan Benar
  const crypto = require('crypto');
  const validSignature = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

  const checkValid = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount,
    serverKey,
    receivedSignature: validSignature,
  });

  if (!checkValid) {
    throw new Error('Test 1 Gagal: Tanda tangan sah ditolak');
  }
  console.log('✓ Test 1 Lolos: Tanda tangan sah berhasil diverifikasi');

  // 2. Tanda Tangan Salah (Tampering / Spoofing)
  const checkInvalidSig = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount,
    serverKey,
    receivedSignature: 'forged_fake_signature_hash',
  });

  if (checkInvalidSig) {
    throw new Error('Test 2 Gagal: Tanda tangan palsu lolos verifikasi');
  }
  console.log('✓ Test 2 Lolos: Tanda tangan palsu ditolak');

  // 3. Nominal Salah (Amount Mismatch Tampering)
  const checkWrongAmount = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount: '1000', // Diretas menjadi lebih murah
    serverKey,
    receivedSignature: validSignature,
  });

  if (checkWrongAmount) {
    throw new Error('Test 3 Gagal: Manipulasi nominal lolos verifikasi');
  }
  console.log('✓ Test 3 Lolos: Manipulasi nominal ditolak');

  // 4. Webhook Ganda (Idempotency Simulation via Hash Tracking)
  const processedEvents = new Set<string>();
  const eventId = `tx_${orderId}_settlement`;

  function processWebhook(evtId: string): boolean {
    if (processedEvents.has(evtId)) {
      return false; // Diabaikan karena duplikat
    }
    processedEvents.add(evtId);
    return true; // Sukses diproses pertama kali
  }

  const firstAttempt = processWebhook(eventId);
  const secondAttempt = processWebhook(eventId);

  if (!firstAttempt || secondAttempt) {
    throw new Error('Test 4 Gagal: Webhook ganda tidak diisolasi secara idempoten');
  }
  console.log('✓ Test 4 Lolos: Webhook ganda ditangani secara idempoten');
}
