import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { serverDb } from '@/lib/server-db';

export async function GET(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ status: 'unauthorized', message: 'Hanya admin yang memiliki hak akses.' }, { status: 403 });
  }

  const users = serverDb.getAllUsers();
  return NextResponse.json({ status: 'success', data: users });
}

export async function PUT(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ status: 'unauthorized', message: 'Hanya admin yang memiliki hak akses.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, is_pro, reason } = body;

    if (!userId || typeof is_pro !== 'boolean') {
      return NextResponse.json({ status: 'error', message: 'Parameter userId dan status is_pro diperlukan.' }, { status: 400 });
    }

    const targetUser = serverDb.findUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ status: 'error', message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    serverDb.setUserPro(userId, is_pro);

    // Catat ke audit log
    serverDb.addAuditLog({
      admin_id: admin.id,
      admin_email: admin.email,
      target_user_id: targetUser.id,
      target_email: targetUser.email,
      action: is_pro ? 'GRANT_PRO_MANUAL' : 'REVOKE_PRO_MANUAL',
      tier: is_pro ? 'pro_manual' : undefined,
      reason: reason || 'Diubah manual dari dashboard admin',
    });

    return NextResponse.json({
      status: 'success',
      message: `Status Pro untuk ${targetUser.email} berhasil ${is_pro ? 'diaktifkan' : 'dinonaktifkan'}.`,
    });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Gagal mengubah status pengguna.' }, { status: 500 });
  }
}
