import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, jobs } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { session };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  db.update(jobs).set({
    ...(body.status ? { status: body.status } : {}),
    updatedAt: new Date().toISOString(),
  }).where(eq(jobs.id, id)).run();

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  getDb().delete(jobs).where(eq(jobs.id, id)).run();
  return NextResponse.json({ success: true });
}
