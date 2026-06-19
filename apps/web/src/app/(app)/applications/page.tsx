import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, jobs, companies, mapJob, mapCompany, mapApplication } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getTier } from '@/lib/access';
import { getCandidateRowByUserId, listApplications } from '@/lib/queries';
import { ApplicationsClient } from './ApplicationsClient';

export default async function ApplicationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  const db = getDb();
  const apps = await listApplications(candidate.id);
  const rows = [];
  for (const app of apps) {
    const jobRow = (await db.select({ job: jobs, company: companies }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.id, app.jobId)).limit(1))[0];
    rows.push(mapApplication(app, jobRow ? mapJob(jobRow.job, mapCompany(jobRow.company)) : undefined));
  }

  const interviews = rows.filter((a) => ['interview', 'hr_screen', 'technical_round', 'case_study', 'final_round'].includes(a.status)).length;
  const responded = rows.filter((a) => !['applied', 'saved'].includes(a.status)).length;

  return (
    <ApplicationsClient
      applications={rows}
      isPro={(await getTier(session)) === 'pro'}
      analytics={{
        total: rows.length,
        interviews,
        responseRate: rows.length ? Math.round((responded / rows.length) * 100) : 0,
        followUpsDue: rows.filter((a) => a.status === 'applied').length,
      }}
    />
  );
}
