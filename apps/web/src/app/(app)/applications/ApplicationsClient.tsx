'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Application, Job } from '@careersignal/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LockedFeature } from '@/components/ui/LockedFeature';
import { ClipboardList } from 'lucide-react';
import { APPLICATION_STAGES, type applicationAnalytics } from '@/lib/career-actions';
import { ApplicationControls } from '@/components/applications/ApplicationControls';
import { formatDate } from '@/lib/utils';

interface AppWithJob extends Application {
  job?: Job;
}

interface Props {
  applications: AppWithJob[];
  analytics: ReturnType<typeof applicationAnalytics>;
  isPro?: boolean;
}

export function ApplicationsClient({ applications, analytics, isPro = false }: Props) {
  const [view, setView] = useState<'board' | 'table' | 'analytics'>('board');

  if (applications.length === 0) {
    return (
      <>
        <PageHeader title="Applications" subtitle="Track your job search pipeline" />
        <EmptyState
          title="No applications yet"
          description="Apply to high-match jobs to start tracking your pipeline."
          icon={ClipboardList}
          action={{ label: 'Browse jobs', href: '/jobs' }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="Track stages, manage follow-ups, and record your next action"
        actions={
          <div className="flex gap-2">
            {(['board', 'table', 'analytics'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-sm capitalize ${view === v ? 'bg-primary-muted text-primary' : 'text-muted-foreground hover:bg-surface-muted'}`}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />

      {view === 'analytics' && (
        isPro ? (
          <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="card-surface p-4"><p className="text-sm text-muted-foreground">Applications</p><p className="text-2xl font-bold">{analytics.total}</p></div>
            <div className="card-surface p-4"><p className="text-sm text-muted-foreground">Interviews</p><p className="text-2xl font-bold">{analytics.interviews}</p></div>
            <div className="card-surface p-4"><p className="text-sm text-muted-foreground">Response rate</p><p className="text-2xl font-bold">{analytics.responseRate == null ? '—' : `${analytics.responseRate}%`}</p></div>
            <div className="card-surface p-4"><p className="text-sm text-muted-foreground">Follow-ups due</p><p className="text-2xl font-bold">{analytics.followUpsDue}</p></div>
          </div>
          <p className="text-sm text-muted-foreground">{analytics.responded} recorded responses from {analytics.total} submitted applications; {analytics.pending} pending. Views, reminders, and ghosted applications are not employer responses. Interview counts include offers and current interview stages; historical stages are not available.</p>
          <div className="card-surface overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="p-3 text-left font-semibold">Outcomes by exact job title — descriptive counts, not evidence of causation</caption>
              <thead><tr><th className="p-3" scope="col">Role</th><th className="p-3" scope="col">Submitted</th><th className="p-3" scope="col">Responses</th><th className="p-3" scope="col">Interview / offer</th></tr></thead>
              <tbody>{analytics.byRole.map((group) => <tr key={group.role} className="border-t border-border"><th scope="row" className="p-3 font-medium">{group.role}</th><td className="p-3">{group.total}</td><td className="p-3">{group.responded}</td><td className="p-3">{group.interviews}</td></tr>)}</tbody>
            </table>
          </div>
          </div>
        ) : (
          <LockedFeature
            level="pro-feature"
            title="Application analytics is a Pro feature"
            description="See funnel conversion, response rates, interview counts, and follow-ups due across your whole pipeline."
            preview={
              <div className="grid gap-4 p-6 sm:grid-cols-4">
                <div className="h-20 rounded bg-muted" />
                <div className="h-20 rounded bg-muted" />
                <div className="h-20 rounded bg-muted" />
                <div className="h-20 rounded bg-muted" />
              </div>
            }
          />
        )
      )}

      {view === 'table' && (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3">Job</th><th className="p-3">Status</th><th className="p-3">Applied</th><th className="p-3">Signal</th>
            </tr></thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-border">
                  <td className="p-3"><Link href={`/applications/${app.id}`} className="font-medium hover:text-primary">{app.job?.title}</Link></td>
                  <td className="p-3 capitalize">{app.status.replace(/_/g, ' ')}</td>
                  <td className="p-3">{formatDate(app.applied_at)}</td>
                  <td className="p-3">{app.interview_probability != null && <SignalBadge score={app.interview_probability} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.keys(APPLICATION_STAGES).filter((stage) => applications.some((app) => app.status === stage)).map((stage) => (
            <div key={stage} className="w-64 shrink-0">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage.replace(/_/g, ' ')}</h3>
              <div className="space-y-2">
                {applications.filter((a) => a.status === stage).map((app) => (
                  <div key={app.id} id={`application-${app.id}`} className="card-surface scroll-mt-6 p-3">
                    <Link href={`/applications/${app.id}`} className="font-medium text-foreground hover:text-primary">{app.job?.title}</Link>
                    <p className="text-xs text-muted-foreground">{app.job?.company?.name}</p>
                    {app.interview_probability != null && <div className="mt-2"><SignalBadge score={app.interview_probability} /></div>}
                    <p className="mt-2 text-xs text-muted-foreground">Applied {formatDate(app.applied_at)}</p>
                    {app.cv_version_id && <p className="mt-1 break-all text-xs text-muted-foreground">Submitted CV reference: {app.cv_version_id}</p>}
                    {app.follow_up_due_at && <p className="mt-1 text-xs text-muted-foreground">Follow-up: {formatDate(app.follow_up_due_at)}</p>}
                    <ApplicationControls key={app.updated_at} application={app} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
