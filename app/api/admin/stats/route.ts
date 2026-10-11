import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { serverDb } from '@/lib/server-db';

export async function GET(req: NextRequest) {
  const admin = await getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json({ status: 'unauthorized', message: 'Hanya admin yang memiliki hak akses.' }, { status: 403 });
  }

  const stats = await serverDb.getStats();
  const auditLogs = await serverDb.getAuditLogs();

  return NextResponse.json({
    status: 'success',
    data: {
      stats,
      recentAuditLogs: auditLogs.slice(0, 10),
    },
  });
}
