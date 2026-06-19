import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { MatchBadge, SignalBadge } from "@/components/cs/signal-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpgradeNudge, AccessBadge } from "@/components/cs/locked-feature";
import { Search, MapPin, Building2, CheckCircle2, Globe, Plane, ArrowRight, Lock } from "lucide-react";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — CareerSignal" },
      { name: "description", content: "A personalized opportunity feed ranked by fit, signal, and competition — not noise." },
      { property: "og:title", content: "Jobs — CareerSignal" },
      { property: "og:description", content: "Best Match, High Probability, Remote Friendly, Visa Friendly, Low Competition, Stretch Roles." },
    ],
  }),
  component: JobsPreviewPage,
});

const jobs = [
  {
    title: "Senior AI Product Manager",
    company: "BerlinTech AI",
    location: "Berlin / Remote EU",
    salary: "€80K–€105K",
    posted: "2d",
    match: 86,
    why: "AI product and data platform experience",
    missing: "Enterprise SaaS · German language",
    badges: ["Verified", "Visa-friendly", "Remote-friendly"],
  },
  {
    title: "Technical Product Manager, AI Platform",
    company: "GulfCloud",
    location: "Dubai",
    salary: "AED 32K–42K/month",
    posted: "5d",
    match: 81,
    why: "Platform, API, AI workflow experience",
    missing: "Enterprise customer onboarding",
    badges: ["Verified", "Relocation support"],
  },
  {
    title: "Product Owner, Data Products",
    company: "Barcelona Analytics",
    location: "Barcelona / Hybrid",
    salary: "€60K–€78K",
    posted: "1w",
    match: 78,
    why: "Dashboard and data product ownership",
    missing: "Spanish language preferred",
    badges: ["Verified", "Low competition"],
  },
  {
    title: "Growth Product Manager",
    company: "NordicPay",
    location: "Remote EU",
    salary: "€70K–€95K",
    posted: "3d",
    match: 73,
    why: "Marketplace and payments experience",
    missing: "B2C subscription experimentation",
    badges: ["Verified", "Remote-friendly"],
  },
];

const tabs = ["Best Match", "High Probability", "Remote Friendly", "Visa Friendly", "Low Competition", "Recently Posted", "Stretch Roles"];

function JobsPreviewPage() {
  return (
    <MarketingShell>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Jobs</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A personalized opportunity feed
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Ranked by your fit, the interview signal, and the competition for the role. Sign up to
            see jobs scored against your CV.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-card px-3 py-2.5 shadow-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Job title, skill, or company"
                className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-2.5 shadow-sm sm:w-64">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Location or remote"
                className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <Button size="lg" asChild className="h-11"><Link to="/auth" search={{ mode: "signup" }}>Search<ArrowRight className="h-4 w-4" /></Link></Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map((t, i) => (
              <button
                key={t}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  i === 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4">
          {jobs.map((j) => (
            <article key={j.title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elegant)] sm:p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 sm:flex sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {j.company}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span>
                    <span>·</span>
                    <span>{j.salary}</span>
                    <span>·</span>
                    <span>{j.posted} ago</span>
                  </div>
                  <h2 className="mt-1 truncate text-lg font-semibold text-foreground sm:text-xl">{j.title}</h2>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <MatchBadge value={j.match} />
                  <SignalBadge signal={j.match >= 80 ? "Strong" : j.match >= 65 ? "Moderate" : "Weak"} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-success-soft p-3 text-sm text-success">
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Why it matches</div>
                  <div className="mt-1 text-success-foreground/90">{j.why}</div>
                </div>
                <div className="rounded-lg bg-warning-soft p-3 text-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-warning-foreground/80">Missing</div>
                  <div className="mt-1 text-warning-foreground">{j.missing}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {j.badges.map((b) => (
                    <Badge key={b} variant="secondary" className="font-normal">
                      {b === "Verified" && <CheckCircle2 className="h-3 w-3 text-success" />}
                      {b === "Remote-friendly" && <Globe className="h-3 w-3" />}
                      {b.includes("Visa") && <Plane className="h-3 w-3" />}
                      {b}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <AccessBadge level="login-required" />
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/auth" search={{ mode: "signup" }}><Lock className="h-3.5 w-3.5" />Save</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/auth" search={{ mode: "signup" }}>Sign up to view full match</Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <UpgradeNudge
          className="mt-8"
          level="free-preview"
          message="You're browsing a sample feed. Sign up to see jobs ranked against your CV."
          ctaLabel="Create free account"
        />

        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">See jobs scored against your CV</h2>
          <p className="mt-1 text-sm text-muted-foreground">Free to start. No credit card.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="lg" asChild><Link to="/auth" search={{ mode: "signup" }}>Create account<ArrowRight className="h-4 w-4" /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/pricing">Upgrade to Pro</Link></Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
