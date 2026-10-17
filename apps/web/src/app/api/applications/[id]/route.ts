import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import {
  applications,
  applicationSnapshots,
  getDb,
  mapApplication,
} from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { parseApplicationAction } from '@/lib/career-actions';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate)
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  const { id } = await context.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      { error: 'Invalid application ID' },
      { status: 400 },
    );
  }
  const body: unknown = await request.json().catch(() => null);
  const change = parseApplicationAction(body);
  if (!change)
    return NextResponse.json(
      { error: 'Invalid application update' },
      { status: 400 },
    );
  const updatedAt = new Date(
    Math.max(Date.now(), Date.parse(change.expected_updated_at) + 1),
  ).toISOString();
  const patch: Partial<Omit<typeof applications.$inferInsert, 'appliedAt'>> & {
    appliedAt?: string | ReturnType<typeof sql>;
  } = { updatedAt };
  switch (change.action) {
    case 'snooze':
      patch.followUpDueAt = new Date(Date.now() + 7 * 86400000).toISOString();
      break;
    case 'complete':
      patch.followUpDueAt = null;
      break;
    case 'note':
      patch.nextAction = change.note || null;
      break;
    case 'status':
      patch.status = change.status;
      if (change.status !== 'saved') {
        patch.appliedAt = sql`case when ${applications.status}='saved' and not exists
          (select 1 from ${applicationSnapshots} where ${applicationSnapshots.applicationId}=${applications.id})
          then ${updatedAt}::timestamptz else ${applications.appliedAt} end`;
      }
      // A new stage clears the old reminder. Only waiting stages receive a fresh one.
      patch.followUpDueAt = [
        'applied',
        'viewed',
        'recruiter_viewed',
        'shortlisted',
        'follow_up_needed',
      ].includes(change.status)
        ? new Date(Date.now() + 7 * 86400000).toISOString()
        : null;
      break;
  }
  try {
    const [row] = await getDb()
      .update(applications)
      .set(patch)
      .where(
        and(
          eq(applications.id, id),
          eq(applications.candidateId, candidate.id),
          eq(applications.updatedAt, change.expected_updated_at),
        ),
      )
      .returning();
    if (!row)
      return NextResponse.json(
        {
          error:
            'Application changed or is unavailable. Refresh and try again.',
        },
        { status: 409 },
      );
    return NextResponse.json({
      application: mapApplication(row, undefined, {
        includePrivateNotes: true,
      }),
    });
  } catch {
    console.error('[applications] Update failed');
    return NextResponse.json(
      { error: 'Unable to save. Please try again.' },
      { status: 503 },
    );
  }
}
