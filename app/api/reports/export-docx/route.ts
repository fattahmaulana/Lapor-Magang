import { NextRequest, NextResponse } from 'next/server';
import { generateDocxBuffer } from '@/lib/export/server-documents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recap, author, instance } = body;

    if (!recap) {
      return NextResponse.json({ status: 'error', message: 'Data rekap diperlukan.' }, { status: 400 });
    }

    const buffer = await generateDocxBuffer(recap, author, instance);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="Laporan-Mingguan-Magang.docx"',
      },
    });
  } catch (err) {
    console.error('Error generating docx:', err);
    return NextResponse.json({ status: 'error', message: 'Gagal membuat file Word.' }, { status: 500 });
  }
}
