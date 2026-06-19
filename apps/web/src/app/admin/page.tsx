import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, Building2, Briefcase, Shield } from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { getSession } from '@/lib/auth/session';
import { getAdminTrustStats, listOpenJobReports, listUnverifiedCompanies } from '@/lib/queries';

export default async function AdminTrustDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const stats = await getAdminTrustStats();
  const pendingCompanies = (await listUnverifiedCompanies()).slice(0, 5);
  const recentReports = (await listOpenJobReports()).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Trust dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Platform safety, verification, and moderation overview</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Unverified companies" value={stats.unverifiedCompanies} icon={Building2} accent="warning" />
        <MetricCard label="Open reports" value={stats.openReports} icon={AlertTriangle} accent="primary" />
        <MetricCard label="Published jobs" value={stats.publishedJobs} icon={Briefcase} accent="success" />
        <MetricCard label="High scam risk jobs" value={stats.highRiskJobs} icon={Shield} accent="neutral" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Verification queue</h2>
            <Link href="/admin/companies" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {pendingCompanies.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No companies pending verification.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {pendingCompanies.map((company) => (
                <li key={company.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium">{company.name}</span>
                  <span className="rounded-full bg-warning-muted px-2 py-0.5 text-xs text-warning">
                    Pending
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent scam reports</h2>
            <Link href="/admin/alerts" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentReports.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No open reports.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {recentReports.map((report) => (
                <li key={report.id} className="py-3 text-sm">
                  <p className="font-medium text-foreground">{report.job?.title || 'Unknown job'}</p>
                  <p className="text-muted-foreground">{report.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/jobs" className="btn-primary px-4 py-2 text-sm">
          Manage jobs
        </Link>
        <Link href="/admin/analytics" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-muted">
          Platform analytics
        </Link>
      </div>
    </div>
  );
}
