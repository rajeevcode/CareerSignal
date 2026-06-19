import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { listJobApplicants, listRecruiterJobs } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export default async function RecruiterJobsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'recruiter') redirect('/dashboard');

  const jobs = await listRecruiterJobs(session.userId);
  const jobsWithCounts = await Promise.all(
    jobs.map(async (job) => ({
      job,
      applicantCount: (await listJobApplicants(job.id)).length,
    })),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Your jobs</h1>
        <Link href="/recruiter/jobs/new" className="btn-primary px-4 py-2 text-sm">
          Post new job
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto card-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Applicants</th>
              <th className="px-4 py-3">Posted</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobsWithCounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No jobs yet.{' '}
                  <Link href="/recruiter/jobs/new" className="text-primary hover:underline">
                    Post your first job
                  </Link>
                </td>
              </tr>
            ) : (
              jobsWithCounts.map(({ job, applicantCount }) => (
                <tr key={job.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{job.title}</td>
                  <td className="px-4 py-3">{job.company?.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        job.status === 'published'
                          ? 'bg-success-muted text-success'
                          : 'bg-surface-muted text-muted-foreground'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{applicantCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(job.posted_at)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/recruiter/jobs/${job.id}/candidates`}
                      className="text-primary hover:underline"
                    >
                      Candidates
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
