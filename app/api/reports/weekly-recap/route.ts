import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyRecap } from '@/lib/ai/adapter';
import type { DailyLogItem } from '@/types/report';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logs, weekLabel, week_label } = body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Daftar riwayat laporan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const recap = await generateWeeklyRecap(logs as DailyLogItem[], weekLabel || week_label || 'Rekap Mingguan');
    return NextResponse.json({ status: 'success', data: recap, recap });
  } catch (error) {
    console.error('Error weekly recap:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal membuat rekap mingguan.' },
      { status: 500 }
    );
  }
}
