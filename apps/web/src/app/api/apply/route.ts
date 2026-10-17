import { NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  getDb,
  applications,
  applicationSnapshots,
  jobs,
  companies,
  cvUploads,
  cvVersions,
  toIsoNow,
} from '@careersignal/db';
import { getSession, getCurrentUser } from '@/lib/auth/session';
import { sendApplicationConfirmationEmail } from '@/lib/email';
import { getCandidateRowByUserId, getMatchScore } from '@/lib/queries';
import { getUserPlan } from '@/lib/access';
import { FREE_LIMITS } from '@/lib/billing';
import { record } from '@/lib/career-intelligence';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = record(await request.json().catch(() => null));
  const jobId = body.job_id,
    versionId = body.cv_version_id;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    typeof jobId !== 'string' ||
    !uuid.test(jobId) ||
    (versionId !== undefined &&
      (typeof versionId !== 'string' || !uuid.test(versionId)))
  )
    return NextResponse.json(
      { error: 'Invalid job or CV version' },
      { status: 400 },
    );
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate)
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  const db = getDb();
  const [jobRow] = await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(eq(jobs.id, jobId), eq(jobs.status, 'published')))
    .limit(1);
  if (!jobRow)
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const [builder] = await db
    .select()
    .from(cvVersions)
    .where(
      and(
        eq(cvVersions.candidateId, candidate.id),
        typeof versionId === 'string'
          ? eq(cvVersions.id, versionId)
          : eq(cvVersions.isPrimary, true),
      ),
    )
    .orderBy(desc(cvVersions.updatedAt))
    .limit(1);
  if (versionId && !builder)
    return NextResponse.json(
      { error: 'CV version not found' },
      { status: 404 },
    );
  const [cv] = await db
    .select()
    .from(cvUploads)
    .where(
      and(
        eq(cvUploads.candidateId, candidate.id),
        eq(cvUploads.isPrimary, true),
      ),
    )
    .orderBy(desc(cvUploads.uploadedAt))
    .limit(1);
  const [match, plan] = await Promise.all([
    getMatchScore(candidate.id, jobId),
    getUserPlan(session.userId),
  ]);
  const interviewSignal = match?.interview_signal ?? match?.final_score ?? null;
  try {
    const isNew = await db.transaction(async (tx) => {
      // Shared with capture: serialize candidate quota checks without holding a lock over network work.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${candidate.id},0))`,
      );
      const [existing] = await tx
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.candidateId, candidate.id),
            eq(applications.jobId, jobId),
          ),
        )
        .for('update');
      const now = toIsoNow();
      if (existing) {
        // Retrying apply must never reset an interview, offer, or rejection.
        if (existing.status === 'saved') {
          const [snapshot] = await tx
            .select({ id: applicationSnapshots.id })
            .from(applicationSnapshots)
            .where(eq(applicationSnapshots.applicationId, existing.id));
          await tx
            .update(applications)
            .set({
              status: 'applied',
              appliedAt: snapshot ? existing.appliedAt : now,
              matchScore: snapshot
                ? existing.matchScore
                : (match?.final_score ?? null),
              interviewProbability: snapshot
                ? existing.interviewProbability
                : interviewSignal,
              cvVersionId: builder?.id ?? cv?.id ?? null,
              followUpDueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
              updatedAt: now,
            })
            .where(eq(applications.id, existing.id));
          if (!snapshot) {
            await tx
              .update(jobs)
              .set({ applicantCount: sql`${jobs.applicantCount}+1` })
              .where(eq(jobs.id, jobId));
            return true;
          }
        }
        return false;
      }
      if (plan !== 'pro') {
        const [{ used }] = await tx
          .select({ used: sql<number>`count(*)::integer` })
          .from(applications)
          .where(eq(applications.candidateId, candidate.id));
        if (used >= FREE_LIMITS.trackedApplications)
          throw new Error('application-limit');
      }
      await tx.insert(applications).values({
        candidateId: candidate.id,
        jobId,
        status: 'applied',
        cvVersionId: builder?.id ?? cv?.id ?? null,
        matchScore: match?.final_score ?? null,
        interviewProbability: interviewSignal,
        followUpDueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        nextAction: 'Follow up if no response in 7 days',
        appliedAt: now,
        updatedAt: now,
      });
      await tx
        .update(jobs)
        .set({ applicantCount: sql`${jobs.applicantCount}+1` })
        .where(eq(jobs.id, jobId));
      return true;
    });
    let emailSent = false;
    if (isNew) {
      try {
        const user = await getCurrentUser();
        if (user?.email) {
          const result = await sendApplicationConfirmationEmail({
            to: user.email,
            candidateName: user.full_name || user.email.split('@')[0],
            jobTitle: jobRow.job.title,
            companyName: jobRow.company.name,
            interviewSignal,
          });
          emailSent = result.sent;
        }
      } catch {
        console.warn(
          '[apply] Confirmation email unavailable; application was recorded',
        );
      }
    }
    return NextResponse.json({
      success: true,
      job_title: jobRow.job.title,
      company_name: jobRow.company.name,
      email_sent: emailSent,
      is_new: isNew,
      applied_url: '/applications',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'application-limit')
      return NextResponse.json(
        {
          error: 'Tracked application limit reached',
          upgrade: true,
          feature: 'track_application',
        },
        { status: 402 },
      );
    console.error('[apply] Could not record application');
    return NextResponse.json(
      { error: 'Unable to record application. Please retry.' },
      { status: 503 },
    );
  }
}
