import { NextRequest, NextResponse } from 'next/server';
import { createMidtransSnapTransaction } from '@/lib/payments/midtrans';
import { serverDb } from '@/lib/server-db';

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('lm_session')?.value;
    const user = sessionId ? serverDb.findUserById(sessionId) : null;

    if (!user) {
      return NextResponse.json(
        { status: 'unauthorized', message: 'Silakan masuk untuk melakukan pembayaran.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { tier } = body;

    let amount = 5000;
    if (tier === 'pro_3_months') amount = 12000;
    if (tier === 'pro_6_months') amount = 22000;

    const transaction = await createMidtransSnapTransaction({
      userId: user.id,
      userEmail: user.email,
      userName: user.full_name || 'Peserta Magang',
      tier: tier || 'pro_1_month',
      amount,
    });

    // Simpan data order ke server database
    serverDb.createPayment({
      order_id: transaction.orderId,
      user_id: user.id,
      user_email: user.email,
      tier: tier || 'pro_1_month',
      gross_amount: amount,
      snap_token: transaction.snapToken,
      snap_redirect_url: transaction.redirectUrl,
    });

    return NextResponse.json({
      status: 'success',
      order: transaction,
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Gagal membuat tagihan pembayaran Midtrans.' },
      { status: 500 }
    );
  }
}
