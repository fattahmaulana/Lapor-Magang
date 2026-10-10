import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('lm_session')?.value;
  if (!sessionId) {
    return NextResponse.json({ status: 'unauthorized', user: null }, { status: 401 });
  }

  const user = serverDb.findUserById(sessionId);
  if (!user) {
    return NextResponse.json({ status: 'unauthorized', user: null }, { status: 401 });
  }

  return NextResponse.json({
    status: 'success',
    user: {
      id: user.id,
      email: user.email,
      username: user.username || user.email.split('@')[0],
      full_name: user.full_name,
      instance_name: user.instance_name,
      timezone: user.timezone,
      role: user.role,
      is_pro: user.is_pro,
      reminder_email_enabled: user.reminder_email_enabled,
      reminder_email_time: user.reminder_email_time,
    },
  });
}
