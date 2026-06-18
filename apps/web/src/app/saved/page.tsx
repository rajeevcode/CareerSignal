import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/DashboardNav';
import { JobCard } from '@/components/JobCard';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId, listSavedJobs } from '@/lib/queries';

export default async function SavedJobsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  const jobs = listSavedJobs(candidate.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <DashboardNav />
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Saved Jobs</h1>
      <div className="mt-6 space-y-4">
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-slate-600">No saved jobs yet.</p>
            <Link href="/jobs" className="mt-4 inline-block text-indigo-600 hover:underline">Browse jobs →</Link>
          </div>
        ) : (
          jobs.map((job) => job && <JobCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
}
