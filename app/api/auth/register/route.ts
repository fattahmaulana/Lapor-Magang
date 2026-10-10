import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name, instance_name } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { status: 'error', message: 'Alamat email wajib diisi dengan format yang benar.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 10) {
      return NextResponse.json(
        { status: 'error', message: 'Password wajib minimal 10 karakter untuk standar keamanan.' },
        { status: 400 }
      );
    }

    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { status: 'error', message: 'Nama lengkap peserta wajib diisi.' },
        { status: 400 }
      );
    }

    const user = serverDb.createUser({
      email,
      password,
      full_name,
      instance_name: instance_name || 'Instansi Pemagangan',
    });

    const response = NextResponse.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        instance_name: user.instance_name,
        timezone: user.timezone,
        role: user.role,
        is_pro: user.is_pro,
      },
    });

    // Pasang secure session cookie
    response.cookies.set('lm_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 hari
    });

    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal mendaftarkan akun.';
    return NextResponse.json({ status: 'error', message: msg }, { status: 400 });
  }
}
