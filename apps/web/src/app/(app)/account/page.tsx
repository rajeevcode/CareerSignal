import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession, getCurrentUser } from '@/lib/auth/session';
import { getPlanStateForUser } from '@/lib/access';
import { remaining, FREE_LIMITS } from '@/lib/billing';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProBadge } from '@/components/ui/ProBadge';

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/account');

  const user = await getCurrentUser();
  const planState = await getPlanStateForUser(session.userId);
  const isPro = planState.plan === 'pro';
  const left = remaining(planState);

  const rows = left
    ? [
        { label: 'CV uploads', used: planState.usage.cv_upload_count, limit: FREE_LIMITS.cvUploads, leftN: left.cvUploads },
        { label: 'JD matches (this month)', used: planState.usage.jd_match_count_monthly, limit: FREE_LIMITS.jdMatchesMonthly, leftN: left.jdMatches },
        { label: 'Saved jobs', used: planState.usage.saved_jobs_count, limit: FREE_LIMITS.savedJobs, leftN: left.savedJobs },
        { label: 'Tracked applications', used: planState.usage.tracked_applications_count, limit: FREE_LIMITS.trackedApplications, leftN: left.trackedApps },
      ]
    : [];

  return (
    <>
      <PageHeader title="Account" subtitle="Manage your plan and usage" />

      <div className="card-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-medium text-foreground">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Plan</span>
            {isPro ? (
              <ProBadge />
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Free</span>
            )}
          </div>
        </div>

        {!isPro && (
          <Link href="/checkout" className="btn-primary mt-6 inline-block px-6 py-2.5 text-sm">
            Upgrade to Pro
          </Link>
        )}
      </div>

      {!isPro && (
        <div className="card-surface mt-6 p-6">
          <h3 className="font-semibold text-foreground">Free plan usage</h3>
          <div className="mt-4 space-y-4">
            {rows.map((r) => (
              <div key={r.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium text-foreground">
                    {r.used} / {r.limit} · {r.leftN} left
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (r.used / r.limit) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Upgrade to Pro for unlimited usage and all advanced features.
          </p>
        </div>
      )}

      {isPro && (
        <div className="card-surface mt-6 p-6">
          <p className="text-sm text-foreground">You&apos;re on CareerSignal Pro — all features unlocked. 🎉</p>
        </div>
      )}
    </>
  );
}
