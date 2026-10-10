import { NextRequest, NextResponse } from 'next/server';
import { generatePptxBuffer } from '@/lib/export/server-documents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deck } = body;

    if (!deck) {
      return NextResponse.json({ status: 'error', message: 'Data presentasi diperlukan.' }, { status: 400 });
    }

    const buffer = await generatePptxBuffer(deck);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': 'attachment; filename="Laporan-Presentasi-Magang.pptx"',
      },
    });
  } catch (err) {
    console.error('Error generating pptx:', err);
    return NextResponse.json({ status: 'error', message: 'Gagal membuat file PowerPoint.' }, { status: 500 });
  }
}
