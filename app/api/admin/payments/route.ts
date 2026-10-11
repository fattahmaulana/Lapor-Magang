import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { serverDb } from '@/lib/server-db';

export async function GET(req: NextRequest) {
  const admin = await getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ status: 'unauthorized', message: 'Hanya admin yang memiliki hak akses.' }, { status: 403 });
  }

  const payments = await serverDb.getAllPayments();
  return NextResponse.json({ status: 'success', data: payments });
}

export async function POST(req: NextRequest) {
  const admin = await getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ status: 'unauthorized', message: 'Hanya admin yang memiliki hak akses.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { orderId, action, reason } = body;

    if (!orderId || !action) {
      return NextResponse.json({ status: 'error', message: 'Parameter orderId dan action diperlukan.' }, { status: 400 });
    }

    if (action === 'approve') {
      const ok = await serverDb.approvePayment(orderId, admin.id, admin.email);
      if (!ok) {
        return NextResponse.json({ status: 'error', message: 'Transaksi tidak ditemukan.' }, { status: 404 });
      }
      return NextResponse.json({
        status: 'success',
        message: `Pembayaran ${orderId} berhasil disetujui! Status Pro pengguna telah aktif.`,
      });
    }

    if (action === 'reject') {
      const ok = await serverDb.rejectPayment(orderId, admin.id, admin.email, reason || 'Ditolak oleh admin.');
      if (!ok) {
        return NextResponse.json({ status: 'error', message: 'Transaksi tidak ditemukan.' }, { status: 404 });
      }
      return NextResponse.json({
        status: 'success',
        message: `Pembayaran ${orderId} telah ditolak.`,
      });
    }

    return NextResponse.json({ status: 'error', message: 'Aksi tidak valid.' }, { status: 400 });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Gagal memproses persetujuan pembayaran.' }, { status: 500 });
  }
}
