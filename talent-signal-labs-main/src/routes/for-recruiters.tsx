import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Filter, Gauge, MessageSquare, BarChart3, Shield } from "lucide-react";

export const Route = createFileRoute("/for-recruiters")({
  head: () => ({
    meta: [
      { title: "For Recruiters — CareerSignal" },
      { name: "description", content: "Shortlist better candidates faster with AI hiring intelligence." },
      { property: "og:title", content: "For Recruiters — CareerSignal" },
      { property: "og:description", content: "Improve job descriptions, rank candidates by role fit, reduce irrelevant applications." },
    ],
  }),
  component: RecruitersPage,
});

const features = [
  { icon: Users, title: "AI candidate ranking", desc: "Rank applicants by role fit and interview readiness, not by keyword spam." },
  { icon: Filter, title: "Smarter shortlists", desc: "Filter by match score, salary fit, notice period, visa status, and missing skills." },
  { icon: Gauge, title: "JD quality score", desc: "Live suggestions to improve clarity, salary transparency, and signal-to-noise." },
  { icon: MessageSquare, title: "Recruiter messaging", desc: "In-platform messages with structured rejection feedback." },
  { icon: BarChart3, title: "Pipeline analytics", desc: "Time to shortlist, average match score, drop-off, and source quality." },
  { icon: Shield, title: "Trust by default", desc: "Verified companies, scam detection, and recruiter verification — your brand stays clean." },
];

function RecruitersPage() {
  return (
    <MarketingShell>
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
            For recruiters
          </div>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Shortlist better candidates faster with AI hiring intelligence.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-primary-foreground/80 sm:text-lg">
            CareerSignal helps recruiters improve job descriptions, rank candidates by role fit, and
            reduce irrelevant applications.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Get early access<ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)] sm:grid-cols-3 sm:p-10">
          {[
            { k: "Active jobs", v: "8" },
            { k: "New applicants", v: "142" },
            { k: "High-fit candidates", v: "37" },
            { k: "Interview-ready", v: "19" },
            { k: "Avg. match score", v: "72%" },
            { k: "Time to shortlist", v: "2.4d" },
          ].map((m) => (
            <div key={m.k} className="rounded-xl border border-border bg-background p-4">
              <div className="text-2xl font-bold text-foreground">{m.v}</div>
              <div className="text-xs text-muted-foreground">{m.k}</div>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
