import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { status: 'error', message: 'Email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const user = await serverDb.findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'Email atau password tidak sesuai.' },
        { status: 401 }
      );
    }

    const isValid = serverDb.verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return NextResponse.json(
        { status: 'error', message: 'Email atau password tidak sesuai.' },
        { status: 401 }
      );
    }

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

    response.cookies.set('lm_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Terjadi kendala saat memproses login.' },
      { status: 500 }
    );
  }
}
