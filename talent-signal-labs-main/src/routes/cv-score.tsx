import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { ScoreRing } from "@/components/cs/score-ring";
import { Button } from "@/components/ui/button";
import { LockedFeature, UpgradeNudge, AccessBadge } from "@/components/cs/locked-feature";
import { ArrowRight, Upload, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/cv-score")({
  head: () => ({
    meta: [
      { title: "CV Score — CareerSignal" },
      { name: "description", content: "VMock-style CV feedback: eight sub-scores, bullet-level rewrites, and recruiter-scan readiness." },
      { property: "og:title", content: "CV Score — CareerSignal" },
      { property: "og:description", content: "Get a clear, explainable CV score and exactly what to fix next." },
    ],
  }),
  component: CVScorePage,
});

const subs = [
  { label: "ATS Parseability", val: 82 },
  { label: "Formatting", val: 88 },
  { label: "Keyword Strength", val: 71 },
  { label: "Impact Metrics", val: 74 },
  { label: "Role Clarity", val: 80 },
  { label: "Seniority Signal", val: 81 },
  { label: "Skill Relevance", val: 73 },
  { label: "Recruiter Scan", val: 77 },
];

function CVScorePage() {
  return (
    <MarketingShell>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">CV Score</div>
            <AccessBadge level="free-preview" />
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Your CV, explained.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            A score is only useful if it tells you <em>what to do next</em>. Every CareerSignal
            number comes with what it means, why it matters, and the next action.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild><Link to="/auth" search={{ mode: "signup" }}><Upload className="h-4 w-4" />Score my CV</Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/jd-match">Try JD Match<ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-elegant)]">
            <ScoreRing value={78} size={180} strokeWidth={14} tone="primary" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">Overall CV Score</h2>
            <p className="mt-1 text-sm text-muted-foreground">Strong, with room to sharpen for AI Product Manager roles.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="mb-4 text-sm font-semibold text-foreground">Sub-scores</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {subs.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-semibold text-foreground">{s.val}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-success/20 bg-success-soft p-6">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-base font-semibold">What works well</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-foreground/90">
              <li>• Strong AI and product management exposure</li>
              <li>• Clear marketplace and e-commerce experience</li>
              <li>• Strong cross-functional delivery</li>
              <li>• Good business metrics on top achievements</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-warning/30 bg-warning-soft p-6">
            <div className="flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-semibold">What to improve</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-warning-foreground/90">
              <li>• Summary needs sharper target-role positioning</li>
              <li>• Some bullets are too task-based — add outcomes</li>
              <li>• Missing exact keywords for B2B SaaS roles</li>
              <li>• Skills list has tools without context</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <h3 className="text-base font-semibold">Bullet rewrite</h3>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-secondary/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Before</div>
              <p className="mt-2 text-sm text-foreground">Worked on AI dashboards and automation.</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-accent p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">After</div>
              <p className="mt-2 text-sm text-foreground">
                Led AI dashboard and automation workflows that processed 2,000+ daily signals,
                reduced manual review noise by 70%, and improved campaign decision speed for
                cross-functional teams.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium">
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">+12 Impact</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">+8 Keywords</span>
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning-foreground">+5 Seniority</span>
              </div>
            </div>
          </div>
        </div>

        <UpgradeNudge
          className="mt-8"
          level="free-preview"
          message="You're viewing a sample. Sign up to score your own CV — free."
          ctaLabel="Score my CV"
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <LockedFeature
            level="login-required"
            title="Section-by-section feedback"
            description="Detailed feedback on Summary, Experience, Skills, Projects, and Education — line by line."
            preview={
              <div className="space-y-2 p-6 text-xs">
                {["Summary: sharpen target role", "Experience: add metrics to top 3 bullets", "Skills: group by domain"].map((t) => (
                  <div key={t} className="rounded-lg bg-secondary/40 p-3">{t}</div>
                ))}
              </div>
            }
          />
          <LockedFeature
            level="pro-feature"
            title="AI bullet rewrite & ATS keyword analysis"
            description="One-click bullet rewrites with quantified impact, plus role-specific ATS keyword gap analysis."
            preview={
              <div className="p-6 text-xs">
                <div className="rounded-lg border border-border bg-secondary/40 p-3">Before: Worked on AI dashboards.</div>
                <div className="mt-2 rounded-lg border border-primary/20 bg-accent p-3">After: Led AI dashboards processing 2,000+ daily signals…</div>
              </div>
            }
          />
          <LockedFeature
            level="pro-feature"
            title="Multiple CV versions"
            description="Build role-specific CV versions and track which one performs best per application stage."
          />
          <LockedFeature
            level="pro-feature"
            title="Export your optimized CV"
            description="Download polished PDF or DOCX exports with ATS-friendly formatting."
          />
        </div>
      </section>
    </MarketingShell>
  );
}
