import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Target, ListChecks, MessagesSquare, Compass } from 'lucide-react';
import { ScoreRing } from '@/components/cs/ScoreRing';
import { MatchBadge, SignalBadge } from '@/components/cs/SignalBadge';
import { MetricCard } from '@/components/ui/MetricCard';
import { LockedFeature } from '@/components/ui/LockedFeature';

export const metadata: Metadata = {
  title: 'Demo Dashboard — CareerSignal',
  description:
    'Preview the CareerSignal dashboard with sample data. Create a free account to analyze your own CV and track real applications.',
};

const btn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover';
const btnOutline =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted';

export default function DemoDashboard() {
  return (
    <>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Demo Preview</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Preview the CareerSignal Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            This is a sample dashboard with fictional data. Create a free account to analyze your own CV, match real
            jobs, and track applications.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/register" className={btn}>
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className={btnOutline}>
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Sample CV Score" value="78" hint="out of 100" />
          <MetricCard label="Sample JD Match" value="82" hint="for AI PM roles" />
          <MetricCard label="Interview Signal" value="Strong" hint="3 of last 5 roles" />
          <MetricCard label="High-Fit Jobs" value="18" hint="this week" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]">
            <ScoreRing value={78} size={160} strokeWidth={12} tone="primary" />
            <div className="mt-3 text-sm font-semibold text-foreground">Career Health Score</div>
            <div className="text-xs text-muted-foreground">Sample · based on demo profile</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Top job matches (sample)</div>
              <span className="text-xs text-muted-foreground">Demo data</span>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {[
                { t: 'Senior AI Product Manager', c: 'BerlinTech AI', m: 86, s: 'Strong' as const },
                { t: 'Technical PM, AI Platform', c: 'GulfCloud', m: 81, s: 'Moderate' as const },
                { t: 'Growth PM', c: 'NordicPay', m: 73, s: 'Moderate' as const },
              ].map((j) => (
                <li key={j.t} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{j.t}</div>
                    <div className="truncate text-xs text-muted-foreground">{j.c}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SignalBadge signal={j.s} />
                    <MatchBadge value={j.m} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Your personal CareerSignal</h2>
              <p className="text-sm text-muted-foreground">Unlock the full dashboard with a free account.</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <LockedFeature
              level="login-required"
              title="Today's next best actions"
              description="A daily action plan that ranks every CV fix, JD match, and follow-up by impact."
              preview={
                <div className="space-y-2 p-6">
                  {['Tailor CV for Senior AI PM at BerlinTech', 'Follow up with NordicPay recruiter', 'Add 3 metrics to your top 2 bullets'].map(
                    (t) => (
                      <div key={t} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          +
                        </span>
                        <span className="text-sm text-foreground">{t}</span>
                      </div>
                    ),
                  )}
                </div>
              }
            />
            <LockedFeature
              level="login-required"
              title="CV improvement plan"
              description="Section-by-section feedback with one-click AI bullet rewrites and missing-keyword fixes."
              preview={
                <div className="space-y-3 p-6">
                  <div className="rounded-lg bg-secondary/40 p-3 text-xs">Summary needs sharper target-role positioning.</div>
                  <div className="rounded-lg bg-secondary/40 p-3 text-xs">3 bullets are too task-based — add outcomes.</div>
                  <div className="rounded-lg bg-secondary/40 p-3 text-xs">Missing keywords: B2B SaaS, OKRs, ICP.</div>
                </div>
              }
            />
            <LockedFeature
              level="login-required"
              title="Application pipeline"
              description="Track every role from Saved → Offer with reminders, follow-up automation, and version performance."
              preview={
                <div className="grid grid-cols-4 gap-2 p-6 text-xs">
                  {['Saved', 'Applied', 'Interview', 'Offer'].map((s, i) => (
                    <div key={s} className="rounded-lg border border-border bg-card p-3">
                      <div className="font-semibold text-foreground">{s}</div>
                      <div className="mt-1 text-muted-foreground">{[12, 6, 3, 1][i]} jobs</div>
                    </div>
                  ))}
                </div>
              }
            />
            <LockedFeature
              level="pro-feature"
              title="Interview Prep Studio"
              description="Company-specific question banks, STAR builder, 30-60-90 plans, and salary negotiation prep."
              preview={
                <div className="space-y-2 p-6">
                  {[MessagesSquare, ListChecks, Target].map((Icon, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs">
                      <Icon className="h-4 w-4 text-primary" />
                      <span>Sample interview drill #{i + 1}</span>
                    </div>
                  ))}
                </div>
              }
            />
            <LockedFeature
              level="pro-feature"
              title="Career Coach"
              description="An always-on AI assistant that plans your week, drafts recruiter messages, and rewrites your CV per JD."
              preview={
                <div className="p-6 text-sm text-muted-foreground">
                  <Compass className="mb-2 h-6 w-6 text-primary" />
                  &quot;This week, focus on 3 BerlinTech-style roles. Here&apos;s the CV tweak…&quot;
                </div>
              }
            />
            <LockedFeature
              level="pro-feature"
              title="Full career analytics"
              description="Funnel conversion, time-in-stage, CV-version performance, and a weekly AI digest."
              preview={
                <div className="grid grid-cols-3 gap-3 p-6 text-xs">
                  {[
                    ['Apply→Reply', '21%'],
                    ['Reply→Interview', '44%'],
                    ['Interview→Offer', '30%'],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-border p-3">
                      <div className="text-muted-foreground">{k}</div>
                      <div className="mt-1 text-base font-semibold text-foreground">{v}</div>
                    </div>
                  ))}
                </div>
              }
            />
          </div>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-3xl bg-slate-900 p-12 text-center">
          <div className="relative space-y-5">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-glow/20 text-primary-glow">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Ready for your own dashboard?</h2>
            <p className="mx-auto max-w-md text-sm text-slate-400">
              Free account · upload 1 CV · 3 JD matches/month · basic tracker.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href="/register" className={btn}>
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
