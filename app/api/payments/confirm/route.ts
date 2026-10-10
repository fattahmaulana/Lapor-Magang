import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('lm_session')?.value;
    const user = sessionId ? serverDb.findUserById(sessionId) : null;

    if (!user) {
      return NextResponse.json(
        { status: 'unauthorized', message: 'Silakan masuk terlebih dahulu.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { orderId, tier = 'pro_1_month', amount = 5000, note } = body;

    if (!orderId) {
      return NextResponse.json({ status: 'error', message: 'Order ID diperlukan.' }, { status: 400 });
    }

    // Daftarkan sebagai pending_approval (Wajib persetujuan admin agar tidak ada yang curang/bohong)
    const payment = serverDb.submitPaymentForApproval({
      order_id: orderId,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      tier,
      gross_amount: amount,
      payment_method: 'qris_manual_fattah_maulana',
      note: note || 'Pengguna telah scan dan transfer QRIS, menunggu verifikasi mutasi oleh admin',
    });

    return NextResponse.json({
      status: 'success',
      pending_approval: true,
      message:
        'Bukti pembayaran berhasil dikirim ke antrean verifikasi! Status Pro akan aktif setelah disetujui oleh admin (biasanya 5–15 menit).',
      order: payment,
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Gagal mengirim konfirmasi pembayaran.' },
      { status: 500 }
    );
  }
}
