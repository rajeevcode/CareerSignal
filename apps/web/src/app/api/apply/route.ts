import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import {
  getDb,
  applications,
  jobs,
  companies,
  cvUploads,
  newId,
  toIsoNow,
} from '@careersignal/db';
import { getSession, getCurrentUser } from '@/lib/auth/session';
import { sendApplicationConfirmationEmail } from '@/lib/email';
import { getCandidateRowByUserId, getMatchScore } from '@/lib/queries';
import { getPlanStateForUser, gate, paywallBody } from '@/lib/access';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { job_id } = await request.json();
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const db = getDb();
  const jobRow = (await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.id, job_id))
    .limit(1))[0];

  if (!jobRow) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const cv = (await db.select().from(cvUploads)
    .where(and(eq(cvUploads.candidateId, candidate.id), eq(cvUploads.isPrimary, true)))
    .limit(1))[0];

  const match = await getMatchScore(candidate.id, job_id);
  const now = toIsoNow();
  const interviewSignal = match?.interview_signal ?? match?.final_score ?? null;

  const existing = (await db.select().from(applications)
    .where(and(eq(applications.candidateId, candidate.id), eq(applications.jobId, job_id)))
    .limit(1))[0];

  const isNewApplication = !existing;

  // Free plan caps the number of tracked applications. Re-applying to a job you
  // already track is always allowed (it doesn't add a row).
  if (isNewApplication) {
    const trackGate = gate(await getPlanStateForUser(session.userId), 'track_application');
    if (!trackGate.allowed) {
      return NextResponse.json(paywallBody(trackGate), { status: 402 });
    }
  }

  if (existing) {
    await db.update(applications).set({ status: 'applied', updatedAt: now }).where(eq(applications.id, existing.id));
  } else {
    await db.insert(applications).values({
      id: newId(),
      candidateId: candidate.id,
      jobId: job_id,
      status: 'applied',
      cvVersionId: cv?.id ?? null,
      matchScore: match?.final_score ?? null,
      interviewProbability: interviewSignal,
      followUpDueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      nextAction: 'Follow up if no response in 7 days',
      appliedAt: now,
      updatedAt: now,
    });

    await db.update(jobs)
      .set({ applicantCount: (jobRow.job.applicantCount || 0) + 1 })
      .where(eq(jobs.id, job_id));
  }

  let emailSent = false;
  if (isNewApplication) {
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
  }

  return NextResponse.json({
    success: true,
    job_title: jobRow.job.title,
    company_name: jobRow.company.name,
    email_sent: emailSent,
    is_new: isNewApplication,
    applied_url: '/applied',
  });
}
