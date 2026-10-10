import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { serverDb } from '@/lib/server-db';

export async function GET(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ status: 'unauthorized', message: 'Hanya admin yang memiliki hak akses.' }, { status: 403 });
  }

  const keys = serverDb.getAiKeys(true);
  return NextResponse.json({ status: 'success', data: keys });
}

export async function POST(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ status: 'unauthorized', message: 'Hanya admin yang memiliki hak akses.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, provider, api_key } = body;

    if (!api_key || typeof api_key !== 'string' || api_key.trim().length < 10) {
      return NextResponse.json({ status: 'error', message: 'Kunci API AI wajib diisi dan valid.' }, { status: 400 });
    }

    const created = serverDb.addAiKey({
      name: name || 'Kunci Gemini',
      provider: provider || 'gemini',
      api_key: api_key.trim(),
    });

    serverDb.addAuditLog({
      admin_id: admin.id,
      admin_email: admin.email,
      target_user_id: 'system_ai_pool',
      target_email: 'ai-engine@lapormagang.id',
      action: 'ADD_AI_KEY',
      reason: `Menambahkan kunci AI: ${created.name}`,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Kunci API AI berhasil ditambahkan ke pool sistem.',
      data: {
        id: created.id,
        name: created.name,
        provider: created.provider,
        is_active: created.is_active,
        usage_count: created.usage_count,
        created_at: created.created_at,
      },
    });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Gagal menambahkan kunci AI.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ status: 'unauthorized', message: 'Hanya admin yang memiliki hak akses.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'ID kunci diperlukan.' }, { status: 400 });
    }

    const toggled = serverDb.toggleAiKey(id);
    return NextResponse.json({ status: 'success', toggled });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Gagal mengubah status kunci.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ status: 'unauthorized', message: 'Hanya admin yang memiliki hak akses.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ status: 'error', message: 'ID kunci diperlukan.' }, { status: 400 });
  }

  const deleted = serverDb.deleteAiKey(id);
  return NextResponse.json({ status: 'success', deleted });
}
