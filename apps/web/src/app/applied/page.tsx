import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, jobs, companies, mapJob, mapCompany } from '@careersignal/db';
import { DashboardNav } from '@/components/DashboardNav';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId, listApplications } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export default async function AppliedJobsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  const db = getDb();
  const applicationRows = listApplications(candidate.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <DashboardNav />
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Applied Jobs</h1>
      <p className="mt-1 text-slate-600">
        Track your application status. New applications trigger an in-app confirmation and email when Resend is configured.
      </p>

      <div className="mt-6 space-y-4">
        {applicationRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-slate-600">No applications yet.</p>
            <Link href="/recommended" className="mt-4 inline-block text-indigo-600 hover:underline">View recommended jobs →</Link>
          </div>
        ) : (
          applicationRows.map((app) => {
            const jobRow = db
              .select({ job: jobs, company: companies })
              .from(jobs)
              .innerJoin(companies, eq(jobs.companyId, companies.id))
              .where(eq(jobs.id, app.jobId))
              .get();
            const job = jobRow ? mapJob(jobRow.job, mapCompany(jobRow.company)) : null;
            return (
              <div key={app.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5">
                <div>
                  <Link href={`/jobs/${job?.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                    {job?.title}
                  </Link>
                  <p className="text-sm text-slate-500">{job?.company?.name}</p>
                  <p className="mt-1 text-xs text-slate-400">Applied {formatDate(app.appliedAt)}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                    {app.status}
                  </span>
                  {app.interviewProbability != null && (
                    <p className="mt-1 text-xs text-slate-500">{Math.round(app.interviewProbability)}% probability</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
