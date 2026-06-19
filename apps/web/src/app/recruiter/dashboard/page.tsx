import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase, MessageSquare, UserCheck, Users } from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { getSession } from '@/lib/auth/session';
import {
  countRecruiterApplicants,
  countRecruiterShortlisted,
  getRecruiterProfile,
  listRecruiterJobs,
} from '@/lib/queries';

export default async function RecruiterDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'recruiter') redirect('/dashboard');

  const profile = await getRecruiterProfile(session.userId);
  const jobs = await listRecruiterJobs(session.userId);
  const applicants = await countRecruiterApplicants(session.userId);
  const shortlisted = await countRecruiterShortlisted(session.userId);
  const activeJobs = jobs.filter((j) => j.status === 'published').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recruiter dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.company?.name ? `Hiring for ${profile.company.name}` : 'Manage your open roles and pipeline'}
          </p>
        </div>
        <Link href="/recruiter/jobs/new" className="btn-primary px-4 py-2 text-sm">
          Post a job
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active jobs" value={activeJobs} icon={Briefcase} accent="primary" />
        <MetricCard label="Total applicants" value={applicants} icon={Users} accent="neutral" />
        <MetricCard label="Shortlisted" value={shortlisted} icon={UserCheck} accent="success" />
        <MetricCard label="Unread messages" value={0} icon={MessageSquare} accent="warning" />
      </div>

      <div className="mt-8 card-surface p-6">
        <h2 className="font-semibold text-foreground">Recent jobs</h2>
        {jobs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No jobs posted yet.{' '}
            <Link href="/recruiter/jobs/new" className="text-primary hover:underline">
              Post your first role
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {jobs.slice(0, 5).map((job) => (
              <li key={job.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{job.title}</p>
                  <p className="text-muted-foreground">{job.company?.name}</p>
                </div>
                <Link
                  href={`/recruiter/jobs/${job.id}/candidates`}
                  className="text-primary hover:underline"
                >
                  View candidates
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
