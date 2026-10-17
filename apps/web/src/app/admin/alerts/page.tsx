import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { listOpenJobReports } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export default async function AdminAlertsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const reports = await listOpenJobReports();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-primary hover:underline">
        ← Trust dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">Scam & abuse reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">{reports.length} open report{reports.length === 1 ? '' : 's'}</p>

      <div className="mt-8 space-y-4">
        {reports.length === 0 ? (
          <div className="card-surface p-8 text-center text-sm text-muted-foreground">
            No open reports. The platform is clear.
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="card-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {report.job?.title || 'Unknown job'}
                  </p>
                  <p className="text-sm text-muted-foreground">{report.job?.company?.name}</p>
                </div>
                <span className="rounded-full bg-risk-muted px-2 py-0.5 text-xs font-medium text-risk">
                  {report.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-foreground">{report.reason}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Reported {formatDate(report.created_at)}</span>
                {report.job && (
                  <Link href={`/jobs/${report.job.id}`} className="text-primary hover:underline">
                    View job
                  </Link>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn-primary px-3 py-1.5 text-xs" disabled>
                  Resolve
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-muted"
                  disabled
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
