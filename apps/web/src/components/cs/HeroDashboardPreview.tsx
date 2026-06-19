import { ScoreRing } from './ScoreRing';
import { SignalBadge } from './SignalBadge';
import { ArrowUpRight, Briefcase, Clock, Target, Sparkles } from 'lucide-react';

/**
 * Pure-JSX dashboard preview used on the marketing hero (Lovable design).
 * No external images — renders crisp at every density.
 */
export function HeroDashboardPreview() {
  const roles = [
    { name: 'AI Product Manager', pct: 82 },
    { name: 'Technical PM', pct: 76 },
    { name: 'Data PM', pct: 73 },
    { name: 'Growth PM', pct: 61 },
  ];

  return (
    <div className="relative">
      {/* Glow */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[2rem] opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(60% 60% at 30% 20%, var(--primary-glow) 0%, transparent 60%), radial-gradient(50% 50% at 80% 80%, var(--success) 0%, transparent 60%)',
        }}
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elegant)] sm:p-6">
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-risk/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
          </div>
          <div className="text-xs font-medium text-muted-foreground">careersignal.app/dashboard</div>
          <div className="text-xs text-muted-foreground">Rajeev K.</div>
        </div>

        {/* Greeting */}
        <div className="mb-5">
          <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Good evening, Rajeev.</h3>
          <p className="text-sm text-muted-foreground">Your job search signal is improving.</p>
        </div>

        {/* Top row: CV score + signals */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-4">
            <ScoreRing value={78} size={72} strokeWidth={7} tone="primary" className="shrink-0" />
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">CV Score</div>
              <div className="text-sm font-semibold text-foreground">Strong</div>
              <div className="text-xs text-muted-foreground">+6 this week</div>
            </div>
          </div>

          <div className="rounded-xl bg-primary p-4 text-primary-foreground">
            <div className="text-xs uppercase tracking-wider opacity-80">JD Match</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">84</span>
              <span className="text-sm opacity-80">/ 100</span>
            </div>
            <div className="mt-2 text-xs opacity-80">Senior AI Product Manager</div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-success/20 bg-success-soft p-4">
            <div className="text-xs uppercase tracking-wider text-success">Interview Signal</div>
            <div className="mt-1 text-2xl font-bold text-success">Strong</div>
            <div className="mt-1 text-xs text-success/80">Est. shortlist: 76%</div>
          </div>
        </div>

        {/* Metric row */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { icon: Briefcase, label: 'High-fit jobs', value: '18' },
            { icon: Clock, label: 'Follow-ups', value: '4' },
            { icon: Target, label: 'Apps this month', value: '24' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-2 text-xl font-bold text-foreground">{value}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Role probability */}
        <div className="mb-5 rounded-xl border border-border bg-background/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role probability</div>
            <SignalBadge signal="Strong" label="Best fit: AI PM" />
          </div>
          <div className="space-y-2.5">
            {roles.map((r) => (
              <div
                key={r.name}
                className="grid grid-cols-[110px_1fr_36px] items-center gap-3 sm:grid-cols-[140px_1fr_40px]"
              >
                <div className="truncate text-xs text-foreground">{r.name}</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                </div>
                <div className="text-right text-xs font-medium text-muted-foreground">{r.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Next action */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-accent p-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/70">
              Next best action
            </div>
            <div className="text-sm font-medium text-accent-foreground">
              Improve CV summary for Senior AI Product Manager roles
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
