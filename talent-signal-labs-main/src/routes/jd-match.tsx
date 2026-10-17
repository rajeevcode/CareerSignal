import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { ScoreRing } from "@/components/cs/score-ring";
import { MatchBadge, SignalBadge } from "@/components/cs/signal-badge";
import { Button } from "@/components/ui/button";
import { LockedFeature, UpgradeNudge } from "@/components/cs/locked-feature";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/jd-match")({
  head: () => ({
    meta: [
      { title: "JD Match — CareerSignal" },
      { name: "description", content: "Paste any job description and see your match score, missing keywords, and estimated shortlisting probability." },
      { property: "og:title", content: "JD Match — CareerSignal" },
      { property: "og:description", content: "Match your CV to any JD with explainable scoring and concrete next actions." },
    ],
  }),
  component: JDMatchPage,
});

const subs = [
  { label: "Required Skills", val: 80 },
  { label: "Nice-to-Have", val: 64 },
  { label: "Experience", val: 76 },
  { label: "Domain", val: 70 },
  { label: "Seniority", val: 82 },
  { label: "ATS Keywords", val: 68 },
  { label: "Location Fit", val: 60 },
  { label: "Salary Fit", val: 75 },
];

function JDMatchPage() {
  return (
    <MarketingShell>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">JD Match</div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Match your CV to any job description.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Paste a JD and CareerSignal returns a match score, missing keywords, your interview
            signal, and an estimated shortlisting probability — with the exact CV improvements to
            close the gap.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Job description
            </label>
            <textarea
              rows={14}
              defaultValue={`Senior AI Product Manager — BerlinTech AI\n\nWe're hiring a Senior PM to own our AI product surface. You'll define roadmap for LLM-powered workflows, partner with applied research, and evaluate LLM agents...\n\nRequirements:\n• 6+ years product management\n• B2B SaaS / enterprise workflows\n• Experience with AI/ML products\n• Stakeholder management & customer onboarding\n• German language preferred`}
              className="mt-2 w-full resize-none rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option>CV: AI Product Manager v3</option>
                <option>CV: Technical PM v1</option>
              </select>
              <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option>Target: AI Product Manager</option>
                <option>Target: Technical Product Manager</option>
              </select>
            </div>
            <Button size="lg" asChild className="mt-4 w-full">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Sparkles className="h-4 w-4" />
                Analyze with AI
              </Link>
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Sign up free to run the analysis on your own CV.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">Result</h2>
                <div className="flex items-center gap-2">
                  <MatchBadge value={82} />
                  <SignalBadge signal="Strong" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-5">
                <ScoreRing value={82} size={108} strokeWidth={10} tone="primary" label="JD Match" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Estimated shortlisting probability</div>
                  <div className="mt-1 text-3xl font-bold tracking-tight text-foreground">74%</div>
                  <div className="text-xs text-muted-foreground">Indicative — based on CV fit and historical patterns. Not a guarantee.</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {subs.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-semibold text-foreground">{s.val}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${s.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-success/20 bg-success-soft p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-success">Why you match</div>
                <ul className="mt-2 space-y-1 text-foreground/90">
                  <li>• AI product experience</li>
                  <li>• Data dashboard ownership</li>
                  <li>• Marketplace & e-commerce background</li>
                  <li>• Cross-functional delivery</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-warning-foreground">Why you may not be shortlisted</div>
                <ul className="mt-2 space-y-1 text-warning-foreground/90">
                  <li>• Enterprise SaaS not clearly shown</li>
                  <li>• German language preferred</li>
                  <li>• Salesforce ecosystem missing</li>
                  <li>• B2B customer onboarding missing</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Missing keywords</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["B2B SaaS", "Enterprise workflows", "Customer onboarding", "Product discovery", "Roadmap ownership", "AI evaluation", "LLM agents", "Stakeholder management"].map((k) => (
                  <span key={k} className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">{k}</span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-accent p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Next actions</div>
              <ul className="mt-2 space-y-1.5 text-sm text-accent-foreground">
                <li>• Add 8 missing keywords where truthful</li>
                <li>• Rewrite 4 weak bullets with measurable outcomes</li>
                <li>• Sharpen summary to target Senior AI PM</li>
                <li>• Move relevant AI project higher</li>
              </ul>
              <Button asChild className="mt-4">
                <Link to="/auth" search={{ mode: "signup" }}>Improve CV for this JD<ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>

        <UpgradeNudge
          className="mt-8"
          level="free-preview"
          message="You're previewing 1 of 3 free JD matches. Create an account to unlock the rest."
          ctaLabel="Create free account"
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <LockedFeature
            level="pro-feature"
            title="Shortlisting probability & full breakdown"
            description="Estimated shortlisting probability, why-you-match, why-you-may-not, and the recommended CV version for this JD."
            preview={
              <div className="space-y-2 p-6 text-xs">
                <div className="rounded-lg bg-secondary/40 p-3">Shortlisting probability: 68% (Moderate–Strong)</div>
                <div className="rounded-lg bg-secondary/40 p-3">Why you match: AI PM, marketplaces, EU experience</div>
                <div className="rounded-lg bg-secondary/40 p-3">Why you may not: Enterprise SaaS, German language</div>
              </div>
            }
          />
          <LockedFeature
            level="pro-feature"
            title="One-click CV rewrite for this JD"
            description="Generate a tailored CV version with rewritten bullets, missing keywords woven in, and exportable to PDF."
          />
        </div>
      </section>
    </MarketingShell>
  );
}
