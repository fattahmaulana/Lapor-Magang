import crypto from 'crypto';
import { verifyMidtransSignature, getPackageDetails } from '../../lib/payments/midtrans';
import { serverDb } from '../../lib/server-db';

export async function runWebhookSecurityTests() {
  console.log('--- MENJALANKAN TEST KEAMANAN WEBHOOK MIDTRANS (SANDBOX QRIS) ---');

  const serverKey = 'test_server_secret_key_123';
  const orderId = `LM-TEST-${Date.now()}`;
  const statusCode = '200';
  const grossAmount = '5000';

  // 1. Tanda Tangan Benar & Salah
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
    throw new Error('Test 1a Gagal: Tanda tangan sah ditolak');
  }
  console.log('✓ Test 1a Lolos: Tanda tangan valid berhasil diverifikasi');

  const checkInvalidSig = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount,
    serverKey,
    receivedSignature: 'forged_fake_signature_hash',
  });

  if (checkInvalidSig) {
    throw new Error('Test 1b Gagal: Tanda tangan palsu lolos verifikasi');
  }
  console.log('✓ Test 1b Lolos: Tanda tangan palsu ditolak');

  // 2. Nominal Tidak Cocok (Amount Mismatch Tampering)
  const checkWrongAmount = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount: '1000', // Nominal diubah penyerang
    serverKey,
    receivedSignature: validSignature,
  });

  if (checkWrongAmount) {
    throw new Error('Test 2 Gagal: Manipulasi nominal lolos verifikasi');
  }
  console.log('✓ Test 2 Lolos: Manipulasi nominal ditolak');

  // 3. Notifikasi Settlement Dikirim Dua Kali (Idempoten: Pro hanya bertambah sekali)
  const testEmail = `idempotent_${Date.now()}@example.com`;
  const user = await serverDb.createUser({
    email: testEmail,
    password: 'PasswordMagang2026!',
    full_name: 'Test Idempotency User',
    instance_name: 'Magang Test',
  });

  const idempotentOrderId = `LM-IDEM-${Date.now()}`;
  await serverDb.createPayment({
    order_id: idempotentOrderId,
    user_id: user.id,
    user_email: user.email,
    tier: 'pro_1_month',
    gross_amount: 5000,
    payment_method: 'qris',
  });

  // Eksekusi settlement pertama
  const firstSettle = await serverDb.settlePayment(idempotentOrderId);
  const userAfterFirst = await serverDb.findUserById(user.id);

  if (!firstSettle.success || firstSettle.alreadySettled || !userAfterFirst?.is_pro) {
    throw new Error('Test 3 Gagal: Settlement pertama gagal mengaktifkan status Pro');
  }

  const initialExpiry = userAfterFirst.pro_expires_at;

  // Eksekusi settlement kedua (Simulasi webhook ganda/replay dari Midtrans)
  const secondSettle = await serverDb.settlePayment(idempotentOrderId);
  const userAfterSecond = await serverDb.findUserById(user.id);

  if (!secondSettle.alreadySettled) {
    throw new Error('Test 3 Gagal: Webhook kedua tidak ditandai alreadySettled');
  }

  if (userAfterSecond?.pro_expires_at !== initialExpiry) {
    throw new Error('Test 3 Gagal: Masa Pro bertambah dua kali pada order yang sama (Tidak idempoten)');
  }
  console.log('✓ Test 3 Lolos: Notifikasi settlement ganda idempoten (Masa Pro hanya bertambah satu kali)');

  // Bersihkan data user uji
  await serverDb.deleteUser(user.id);

  // 4. Kode Paket Tidak Dikenal Ditolak
  const valid1m = getPackageDetails('1m');
  const valid3m = getPackageDetails('3m');
  const valid6m = getPackageDetails('6m');
  const invalidCode = getPackageDetails('12m_palsu');

  if (!valid1m || valid1m.price !== 5000) {
    throw new Error('Test 4 Gagal: Paket 1m tidak sesuai harga Rp5.000');
  }
  if (!valid3m || valid3m.price !== 12000) {
    throw new Error('Test 4 Gagal: Paket 3m tidak sesuai harga Rp12.000');
  }
  if (!valid6m || valid6m.price !== 22000) {
    throw new Error('Test 4 Gagal: Paket 6m tidak sesuai harga Rp22.000');
  }
  if (invalidCode !== null) {
    throw new Error('Test 4 Gagal: Kode paket tidak dikenal tidak ditolak');
  }
  console.log('✓ Test 4 Lolos: Paket valid dihitung tepat di server dan kode paket tidak dikenal ditolak');
}
