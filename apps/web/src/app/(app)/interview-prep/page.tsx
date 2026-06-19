import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { getDb, jobs, companies, interviewSessions, mapInterviewSession } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId, listApplications } from '@/lib/queries';
import { InterviewPrepClient } from './InterviewPrepClient';
import { MockInterviewPanel } from './MockInterviewPanel';

export default async function InterviewPrepPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  const db = getDb();
  const apps = await listApplications(candidate.id);
  const jobOptions: { id: string; title: string; company: string }[] = [];
  for (const app of apps) {
    const row = (await db.select({ job: jobs, company: companies }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.id, app.jobId)).limit(1))[0];
    if (row) jobOptions.push({ id: row.job.id, title: row.job.title, company: row.company.name });
  }

  const sessionRows = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.candidateId, candidate.id))
    .orderBy(desc(interviewSessions.createdAt));
  const sessions = sessionRows.map(mapInterviewSession);

  return (
    <>
      <InterviewPrepClient jobs={jobOptions} />
      <MockInterviewPanel sessions={sessions} />
    </>
  );
}
