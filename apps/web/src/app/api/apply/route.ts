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

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { job_id } = await request.json();
  const candidate = getCandidateRowByUserId(session.userId);
  if (!candidate) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const db = getDb();
  const jobRow = db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.id, job_id))
    .get();

  if (!jobRow) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const cv = db.select().from(cvUploads)
    .where(and(eq(cvUploads.candidateId, candidate.id), eq(cvUploads.isPrimary, true)))
    .get();

  const match = getMatchScore(candidate.id, job_id);
  const now = toIsoNow();
  const interviewSignal = match?.interview_signal ?? match?.final_score ?? null;

  const existing = db.select().from(applications)
    .where(and(eq(applications.candidateId, candidate.id), eq(applications.jobId, job_id)))
    .get();

  const isNewApplication = !existing;

  if (existing) {
    db.update(applications).set({ status: 'applied', updatedAt: now }).where(eq(applications.id, existing.id)).run();
  } else {
    db.insert(applications).values({
      id: newId(),
      candidateId: candidate.id,
      jobId: job_id,
      status: 'applied',
      cvVersionId: cv?.id ?? null,
      matchScore: match?.final_score ?? null,
      interviewProbability: interviewSignal,
      appliedAt: now,
      updatedAt: now,
    }).run();

    db.update(jobs)
      .set({ applicantCount: (jobRow.job.applicantCount || 0) + 1 })
      .where(eq(jobs.id, job_id))
      .run();
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
