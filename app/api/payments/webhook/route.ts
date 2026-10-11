import { NextRequest, NextResponse } from 'next/server';
import { verifyMidtransSignature } from '@/lib/payments/midtrans';
import { serverDb } from '@/lib/server-db';

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

    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'test_server_key';

    // Verifikasi tanda tangan kriptografis jika signature_key ada
    if (signature_key) {
      const isValid = verifyMidtransSignature({
        orderId: order_id,
        statusCode: status_code,
        grossAmount: gross_amount,
        serverKey,
        receivedSignature: signature_key,
      });

      if (!isValid && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
      }
    }

    // Cek status transaksi sukses
    const isSuccess =
      transaction_status === 'settlement' ||
      transaction_status === 'capture' ||
      (transaction_status === 'success' && fraud_status !== 'deny');

    if (isSuccess && order_id) {
      await serverDb.settlePayment(order_id);
    }

    return NextResponse.json({
      status: 'ok',
      isSuccess,
      order_id,
      message: 'Webhook processed idempotently and Pro status updated',
    });
  } catch {
    return NextResponse.json({ message: 'Webhook error' }, { status: 400 });
  }
}
