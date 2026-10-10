import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/ai/adapter';
import { serverDb } from '@/lib/server-db';

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('lm_session')?.value;
    const user = sessionId ? serverDb.findUserById(sessionId) : null;

    if (!user) {
      return NextResponse.json(
        { status: 'unauthorized', message: 'Silakan masuk terlebih dahulu.' },
        { status: 401 }
      );
    }

    if (!user.is_pro) {
      return NextResponse.json(
        { status: 'error', message: 'Fitur input suara khusus untuk akun Paket Pro.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    const base64Input = formData.get('base64') as string | null;

    let base64 = base64Input;
    let mimeType = 'audio/webm';

    if (file) {
      mimeType = file.type || 'audio/webm';
      const arrayBuffer = await file.arrayBuffer();
      base64 = Buffer.from(arrayBuffer).toString('base64');
    }

    if (!base64) {
      return NextResponse.json(
        { status: 'error', message: 'Data rekaman audio tidak ditemukan.' },
        { status: 400 }
      );
    }

    const transcript = await transcribeAudio(base64, mimeType);

    return NextResponse.json({
      status: 'success',
      transcript,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal memproses suara audio.' },
      { status: 500 }
    );
  }
}
