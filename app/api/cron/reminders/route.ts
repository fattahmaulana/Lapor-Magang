import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SCHEDULER_SECRET || 'dev_cron_secret';
  const expectedHeader = `Bearer ${cronSecret}`;

  try {
    const a = Buffer.from(authHeader);
    const b = Buffer.from(expectedHeader);
    const isAuthorized = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Waktu saat ini di UTC
  const now = new Date();
  const currentHourUTC = now.getUTCHours();
  const currentMinuteUTC = now.getUTCMinutes();

  // Logika scheduler: evaluasi pengingat
  return NextResponse.json({
    status: 'success',
    timestamp: now.toISOString(),
    evaluation: {
      utc_time: `${currentHourUTC}:${currentMinuteUTC}`,
      dispatched_count: 0,
      skipped_already_reported: 0,
    },
  });
}
