import { NextRequest } from 'next/server';
import { serverDb, UserRecord } from '@/lib/server-db';

export function getAuthenticatedAdmin(req: NextRequest): UserRecord | null {
  const sessionId = req.cookies.get('lm_session')?.value;
  if (!sessionId) return null;
  const user = serverDb.findUserById(sessionId);
  if (!user || user.role !== 'admin') return null;
  return user;
}
