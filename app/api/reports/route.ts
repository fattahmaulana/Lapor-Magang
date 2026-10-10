import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

function getAuthenticatedUserId(req: NextRequest): string | null {
  const sessionId = req.cookies.get('lm_session')?.value;
  if (!sessionId) return null;
  const user = serverDb.findUserById(sessionId);
  return user ? user.id : null;
}

// GET: Ambil seluruh riwayat logbook milik pengguna aktif
export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ status: 'unauthorized', message: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const reports = serverDb.getReports(userId);
  return NextResponse.json({ status: 'success', data: reports });
}

// POST: Simpan atau perbarui logbook harian
export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ status: 'unauthorized', message: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { date, raw_notes, activity_desc, learning_desc, obstacle_desc, is_reported } = body;

    if (!date || !activity_desc || !learning_desc || !obstacle_desc) {
      return NextResponse.json(
        { status: 'error', message: 'Seluruh 3 kolom laporan wajib diisi.' },
        { status: 400 }
      );
    }

    const saved = serverDb.saveReport(userId, {
      date,
      raw_notes,
      activity_desc,
      learning_desc,
      obstacle_desc,
      is_reported,
    });

    return NextResponse.json({ status: 'success', data: saved });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Gagal menyimpan laporan.' }, { status: 500 });
  }
}

// DELETE: Hapus logbook
export async function DELETE(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ status: 'unauthorized', message: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get('id');

  if (!reportId) {
    return NextResponse.json({ status: 'error', message: 'ID laporan wajib disertakan.' }, { status: 400 });
  }

  const deleted = serverDb.deleteReport(userId, reportId);
  return NextResponse.json({ status: 'success', deleted });
}
