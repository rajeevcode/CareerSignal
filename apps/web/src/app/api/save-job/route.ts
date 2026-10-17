import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { getDb, savedJobs, newId, toIsoNow } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { getUserPlan } from '@/lib/access';
import { FREE_LIMITS } from '@/lib/billing';
import { canAccessJob } from '@/lib/job-access';
import { record } from '@/lib/career-intelligence';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = record(await request.json().catch(() => null));
  const jobId = body.job_id;
  if (
    typeof jobId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      jobId,
    ) ||
    (body.unsave !== undefined && typeof body.unsave !== 'boolean')
  ) {
    return NextResponse.json(
      { error: 'Invalid saved job request' },
      { status: 400 },
    );
  }
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate)
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  // Allow removing a job that has since closed; new saves require visibility.
  if (!body.unsave && !(await canAccessJob(candidate.id, jobId)))
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  try {
    const pro = (await getUserPlan(session.userId)) === 'pro';
    const accepted = await getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${candidate.id},0))`,
      );
      const owned = and(
        eq(savedJobs.candidateId, candidate.id),
        eq(savedJobs.jobId, jobId),
      );
      if (body.unsave) {
        await tx.delete(savedJobs).where(owned);
        return true;
      }
      const [existing] = await tx
        .select({ id: savedJobs.id })
        .from(savedJobs)
        .where(owned)
        .limit(1);
      if (existing) return true;
      const [{ used }] = await tx
        .select({ used: sql<number>`count(*)::integer` })
        .from(savedJobs)
        .where(eq(savedJobs.candidateId, candidate.id));
      if (!pro && used >= FREE_LIMITS.savedJobs) return false;
      await tx
        .insert(savedJobs)
        .values({
          id: newId(),
          candidateId: candidate.id,
          jobId,
          createdAt: toIsoNow(),
        });
      return true;
    });
    if (!accepted)
      return NextResponse.json(
        {
          error: 'Saved job limit reached',
          upgrade: true,
          feature: 'save_job',
        },
        { status: 402 },
      );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Unable to save this job. Please retry.' },
      { status: 503 },
    );
  }
}
