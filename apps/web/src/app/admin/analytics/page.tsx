import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BarChart3, Briefcase, Building2, Users } from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { getSession } from '@/lib/auth/session';
import { getAdminTrustStats } from '@/lib/queries';
import { getDb, profiles, candidateProfiles } from '@careersignal/db';

export default async function AdminAnalyticsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const stats = await getAdminTrustStats();
  const db = getDb();
  const userCount = (await db.select().from(profiles)).length;
  const candidateCount = (await db.select().from(candidateProfiles)).length;
  const recruiterCount = (await db.select().from(profiles)).filter((u) => u.role === 'recruiter').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-primary hover:underline">
        ← Trust dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">Platform analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">High-level usage and marketplace health (preview)</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total users" value={userCount} icon={Users} accent="primary" />
        <MetricCard label="Candidates" value={candidateCount} icon={Users} accent="neutral" />
        <MetricCard label="Recruiters" value={recruiterCount} icon={Briefcase} accent="success" />
        <MetricCard label="Verified companies" value={stats.verifiedCompanies} icon={Building2} accent="warning" />
      </div>

      <div className="mt-8 card-surface p-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Marketplace snapshot</h2>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">Total jobs</dt>
            <dd className="text-xl font-bold text-foreground">{stats.totalJobs}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Published jobs</dt>
            <dd className="text-xl font-bold text-foreground">{stats.publishedJobs}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Open reports</dt>
            <dd className="text-xl font-bold text-foreground">{stats.openReports}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">
          Detailed charts and funnel analytics will be added in a future release.
        </p>
      </div>
    </div>
  );
}
