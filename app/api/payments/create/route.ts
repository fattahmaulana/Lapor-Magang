import { NextRequest, NextResponse } from 'next/server';
import {
  getPackageDetails,
  generateMidtransOrderId,
  createMidtransQrisCharge,
} from '@/lib/payments/midtrans';
import { serverDb } from '@/lib/server-db';

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('lm_session')?.value;
    const user = sessionId ? await serverDb.findUserById(sessionId) : null;

    if (!user) {
      return NextResponse.json(
        { status: 'unauthorized', message: 'Silakan masuk untuk melakukan pembayaran.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const packageCodeInput = body.packageCode || body.tier || body.code;

    const packageDetails = getPackageDetails(packageCodeInput);
    if (!packageDetails) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Kode paket tidak valid. Pilih 1m (1 bulan), 3m (3 bulan), atau 6m (6 bulan).',
        },
        { status: 400 }
      );
    }

    // Buat orderId unik dan panggil Midtrans Core API QRIS dinamis
    const orderId = generateMidtransOrderId();
    const qrisCharge = await createMidtransQrisCharge({
      orderId,
      packageDetails,
      userEmail: user.email,
      userName: user.full_name || 'Peserta Magang',
    });

    // Simpan order berstatus pending ke database
    await serverDb.createPayment({
      order_id: orderId,
      user_id: user.id,
      user_email: user.email,
      tier: packageDetails.tierId,
      gross_amount: packageDetails.price,
      payment_method: 'qris',
      qris_url: qrisCharge.qrImageUrl || qrisCharge.qrString,
    });

    return NextResponse.json({
      status: 'success',
      order: {
        orderId,
        packageCode: packageDetails.code,
        packageName: packageDetails.label,
        grossAmount: packageDetails.price,
        qrString: qrisCharge.qrString,
        qrImageUrl: qrisCharge.qrImageUrl,
        expiresAt: qrisCharge.expiresAt,
        isMock: qrisCharge.isMock,
        gatewayMessage: qrisCharge.gatewayMessage,
      },
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal membuat transaksi QRIS Midtrans.' },
      { status: 500 }
    );
  }
}
