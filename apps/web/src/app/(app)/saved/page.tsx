import Link from 'next/link';
import { redirect } from 'next/navigation';
import { JobCard } from '@/components/JobCard';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId, listSavedJobs } from '@/lib/queries';

export default async function SavedJobsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  const jobs = await listSavedJobs(candidate.id);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Saved Jobs</h1>
      <div className="mt-6 space-y-4">
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No saved jobs yet.</p>
            <Link href="/jobs" className="mt-4 inline-block text-primary hover:underline">Browse jobs →</Link>
          </div>
        ) : (
          jobs.map((job) => job && <JobCard key={job.id} job={job} />)
        )}
      </div>
    </>
  );
}
