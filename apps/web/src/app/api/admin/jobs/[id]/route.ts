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

  // Whitelist status against the job-status enum so a typo can't write an
  // invalid value the rest of the app never expects.
  const JOB_STATUSES = ['draft', 'published', 'closed'] as const;
  const status =
    typeof body.status === 'string' && (JOB_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as (typeof JOB_STATUSES)[number])
      : undefined;
  if (body.status !== undefined && status === undefined) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await db.update(jobs).set({
    ...(status ? { status } : {}),
    updatedAt: new Date().toISOString(),
  }).where(eq(jobs.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  await getDb().delete(jobs).where(eq(jobs.id, id));
  return NextResponse.json({ success: true });
}
