import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export async function PUT(req: NextRequest) {
  const sessionId = req.cookies.get('lm_session')?.value;
  if (!sessionId) {
    return NextResponse.json({ status: 'unauthorized', message: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const user = await serverDb.findUserById(sessionId);
  if (!user) {
    return NextResponse.json({ status: 'unauthorized', message: 'Pengguna tidak ditemukan.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { full_name, username, instance_name, timezone, old_password, new_password } = body;

    // Jika ingin ganti password
    if (new_password) {
      if (!old_password) {
        return NextResponse.json(
          { status: 'error', message: 'Kata sandi saat ini wajib diisi untuk verifikasi keamanan.' },
          { status: 400 }
        );
      }
      await serverDb.updatePassword(user.id, old_password, new_password);
    }

    // Update data profil
    const updates: Record<string, any> = {};
    if (typeof full_name === 'string' && full_name.trim()) updates.full_name = full_name.trim();
    if (typeof username === 'string' && username.trim()) updates.username = username.trim().toLowerCase();
    if (typeof instance_name === 'string') updates.instance_name = instance_name.trim();
    if (timezone && ['WIB', 'WITA', 'WIT'].includes(timezone)) updates.timezone = timezone;
    if (typeof body.reminder_email_enabled === 'boolean') updates.reminder_email_enabled = body.reminder_email_enabled;
    if (typeof body.reminder_email_time === 'string') updates.reminder_email_time = body.reminder_email_time;

    const updated = await serverDb.updateUser(user.id, updates);

    return NextResponse.json({
      status: 'success',
      message: 'Profil berhasil diperbarui.',
      user: {
        id: updated!.id,
        email: updated!.email,
        username: updated!.username || updated!.email.split('@')[0],
        full_name: updated!.full_name,
        instance_name: updated!.instance_name,
        timezone: updated!.timezone,
        role: updated!.role,
        is_pro: updated!.is_pro,
        reminder_email_enabled: updated!.reminder_email_enabled,
        reminder_email_time: updated!.reminder_email_time,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : 'Gagal memperbarui profil.' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.cookies.get('lm_session')?.value;
  if (!sessionId) {
    return NextResponse.json({ status: 'unauthorized', message: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  try {
    await serverDb.deleteUser(sessionId);

    const response = NextResponse.json({
      status: 'success',
      message: 'Akun dan seluruh data logbook Anda berhasil dihapus permanen.',
    });

    response.cookies.set('lm_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json({ status: 'error', message: 'Gagal menghapus akun.' }, { status: 500 });
  }
}
