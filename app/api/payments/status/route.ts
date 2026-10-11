import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('lm_session')?.value;
    const user = sessionId ? await serverDb.findUserById(sessionId) : null;

    if (!user) {
      return NextResponse.json(
        { status: 'unauthorized', message: 'Silakan masuk terlebih dahulu.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { status: 'error', message: 'Parameter orderId wajib disertakan.' },
        { status: 400 }
      );
    }

    const payment = await serverDb.getPayment(orderId);
    if (!payment) {
      return NextResponse.json(
        { status: 'error', message: 'Transaksi tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Hanya pemilik order atau admin yang boleh membaca status transaksi
    if (payment.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { status: 'unauthorized', message: 'Tidak memiliki izin untuk transaksi ini.' },
        { status: 403 }
      );
    }

    // Jika SociaBuzz dan masih pending, periksa status ke gateway secara aktif
    if (payment.status === 'pending' && payment.payment_method === 'sociabuzz_qris' && payment.snap_token) {
      const { checkSociaBuzzPaymentStatus } = await import('@/lib/payments/sociabuzz');
      const invId = payment.note || payment.order_id;
      const sbStatus = await checkSociaBuzzPaymentStatus(payment.snap_token, invId);
      if (sbStatus === 'paid') {
        await serverDb.settlePayment(orderId);
        payment.status = 'settlement';
      } else if (sbStatus === 'expired' || sbStatus === 'failed') {
        await serverDb.updatePaymentStatus(orderId, sbStatus);
        payment.status = sbStatus;
      }
    }

    // Refresh status profil user terbaru
    const freshUser = await serverDb.findUserById(user.id);

    return NextResponse.json({
      status: 'success',
      data: {
        orderId: payment.order_id,
        paymentStatus: payment.status, // 'pending' | 'settlement' | 'expired' | 'failed'
        grossAmount: payment.gross_amount,
        tier: payment.tier,
        isPro: freshUser?.is_pro ?? false,
        proExpiresAt: freshUser?.pro_expires_at,
        settledAt: payment.settled_at,
      },
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal memeriksa status pembayaran.' },
      { status: 500 }
    );
  }
}
