import { NextRequest, NextResponse } from 'next/server';
import { verifyMidtransSignature } from '@/lib/payments/midtrans';
import { serverDb } from '@/lib/server-db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = payload;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'test_server_secret_key_123';

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json({ message: 'Payload webhook tidak lengkap.' }, { status: 400 });
    }

    // 1. Verifikasi cryptographic signature SHA-512 secara timing-safe
    const isValidSignature = verifyMidtransSignature({
      orderId: order_id,
      statusCode: String(status_code),
      grossAmount: String(gross_amount),
      serverKey,
      receivedSignature: String(signature_key),
    });

    if (!isValidSignature) {
      return NextResponse.json({ message: 'Signature tidak valid.' }, { status: 403 });
    }

    // 2. Ambil data order dari database dan validasi kecocokan nominal (Amount matching)
    const order = await serverDb.getPayment(order_id);
    if (!order) {
      return NextResponse.json({ message: 'Order tidak ditemukan.' }, { status: 404 });
    }

    const payloadAmount = Math.round(Number(gross_amount));
    const expectedAmount = Math.round(Number(order.gross_amount));
    if (payloadAmount !== expectedAmount) {
      return NextResponse.json({ message: 'Nominal pembayaran tidak sesuai.' }, { status: 400 });
    }

    // 3. Status transaksi
    const isPaid =
      transaction_status === 'settlement' ||
      (transaction_status === 'capture' && fraud_status === 'accept');

    if (isPaid) {
      // Idempoten: perpanjangan kumulatif masa aktif Pro
      const settleResult = await serverDb.settlePayment(order_id);
      return NextResponse.json({
        status: 'ok',
        order_id,
        alreadySettled: settleResult.alreadySettled,
      });
    }

    if (
      transaction_status === 'expire' ||
      transaction_status === 'cancel' ||
      transaction_status === 'deny'
    ) {
      await serverDb.updatePaymentStatus(
        order_id,
        transaction_status === 'expire' ? 'expired' : 'failed',
        `Midtrans status: ${transaction_status}`
      );
      return NextResponse.json({ status: 'ok', order_id, transaction_status });
    }

    if (transaction_status === 'pending') {
      await serverDb.updatePaymentStatus(order_id, 'pending', 'Menunggu pembayaran QRIS');
      return NextResponse.json({ status: 'ok', order_id, transaction_status });
    }

    return NextResponse.json({ status: 'ok', order_id });
  } catch (error) {
    console.error('Midtrans Webhook Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Terjadi kendala memproses webhook.' }, { status: 500 });
  }
}
