import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getRecruiterJob, listJobApplicants } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RecruiterCandidatesPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'recruiter') redirect('/dashboard');

  const job = await getRecruiterJob(session.userId, id);
  if (!job) notFound();

  const applicants = await listJobApplicants(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/recruiter/jobs" className="text-sm text-primary hover:underline">
        ← Back to jobs
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">{job.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Shortlist · {job.company?.name} · {applicants.length} applicant{applicants.length === 1 ? '' : 's'}
      </p>

      <div className="mt-8 overflow-x-auto card-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Match score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Applied</th>
            </tr>
          </thead>
          <tbody>
            {applicants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No applicants yet for this role.
                </td>
              </tr>
            ) : (
              applicants.map((app) => (
                <tr key={app.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{app.candidate_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{app.candidate_title || '—'}</td>
                  <td className="px-4 py-3">
                    {app.match_score != null ? `${Math.round(app.match_score)}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary-muted px-2 py-0.5 text-xs text-primary">
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(app.applied_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
