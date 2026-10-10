import { NextRequest, NextResponse } from 'next/server';
import { generatePresentationDeck } from '@/lib/ai/adapter';
import type { DailyLogItem } from '@/types/report';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logs, author, weekTitle, week_label, period, institution } = body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Daftar riwayat laporan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const deck = await generatePresentationDeck(logs as DailyLogItem[], {
      author: author || 'Peserta Magang Kemnaker',
      weekTitle: weekTitle || week_label || period || 'Evaluasi Perkembangan Magang',
      institution: institution || 'Maganghub Kemnaker',
    });

    return NextResponse.json({ status: 'success', data: deck, deck });
  } catch (error) {
    console.error('Error presentation generation:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal membuat slide presentasi.' },
      { status: 500 }
    );
  }
}
