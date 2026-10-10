import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/ai/adapter';
import { checkSimilarityWithHistory } from '@/lib/ai/jaccard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notes, history, tone } = body;

    if (!notes || typeof notes !== 'string') {
      return NextResponse.json(
        { status: 'error', message: 'Catatan kerja wajib diisi.' },
        { status: 400 }
      );
    }

    if (notes.trim().length > 4000) {
      return NextResponse.json(
        { status: 'error', message: 'Catatan kerja maksimal 4.000 karakter.' },
        { status: 400 }
      );
    }

    const result = await generateReport({
      notes,
      previousReports: Array.isArray(history) ? history : [],
      tone: tone || 'standar',
    });

    if (result.status === 'success' && Array.isArray(history) && history.length > 0) {
      const sim = checkSimilarityWithHistory(result.data, history);
      result.similarity_score = sim.maxSimilarity;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Report generation error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      {
        status: 'error',
        message: 'Gagal memproses draf laporan. Silakan periksa koneksi dan coba beberapa saat lagi.',
      },
      { status: 500 }
    );
  }
}
