import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Button } from "@/components/ui/button";
import {
  FileText, Gauge, Target, TrendingUp, Search, ListChecks, MessagesSquare, Compass, ArrowRight,
  Building, ShieldCheck,
} from "lucide-react";
import { AccessBadge, type AccessLevel } from "@/components/cs/locked-feature";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "Product — CareerSignal" },
      { name: "description", content: "Eight integrated modules. See what's free, what unlocks with a free account, and what's reserved for CareerSignal Pro." },
      { property: "og:title", content: "Product — CareerSignal" },
      { property: "og:description", content: "CV builder, scoring, JD matching, smart job search, tracker, interview prep, career coach — with clear free, account, and Pro tiers." },
    ],
  }),
  component: ProductPage,
});

type ModuleCard = {
  icon: typeof FileText;
  name: string;
  desc: string;
  level: AccessLevel;
  cta: { label: string; to: "/cv-score" | "/jd-match" | "/jobs" | "/demo" | "/auth" | "/pricing" | "/for-recruiters"; search?: { mode: "signin" | "signup" } };
  secondary?: { label: string; to: "/pricing" | "/auth" | "/for-recruiters" | "/demo"; search?: { mode: "signin" | "signup" } };
};

const modules: ModuleCard[] = [
  {
    icon: FileText, name: "AI CV Builder", level: "pro-feature",
    desc: "Build multiple role-specific CV versions with AI bullet rewrites and quantified impact.",
    cta: { label: "Preview Builder", to: "/demo" },
    secondary: { label: "Upgrade to Pro", to: "/pricing" },
  },
  {
    icon: Gauge, name: "CV Score", level: "free-preview",
    desc: "Get a sample score and limited resume feedback. Sign up for the full 8-dimension breakdown.",
    cta: { label: "Try Free CV Score", to: "/cv-score" },
    secondary: { label: "Create free account", to: "/auth", search: { mode: "signup" } },
  },
  {
    icon: Target, name: "JD Match Analyzer", level: "free-preview",
    desc: "Paste one job description and see a limited match preview. Pro unlocks unlimited matches.",
    cta: { label: "Try JD Match", to: "/jd-match" },
    secondary: { label: "Upgrade to Pro", to: "/pricing" },
  },
  {
    icon: TrendingUp, name: "Interview Signal", level: "pro-feature",
    desc: "See estimated shortlisting probability and detailed why-you-match reasoning.",
    cta: { label: "Unlock Interview Signal", to: "/pricing" },
    secondary: { label: "See sample", to: "/demo" },
  },
  {
    icon: Search, name: "Smart Job Search", level: "free-preview",
    desc: "Browse a curated sample feed as a guest. Free accounts unlock saving and basic match.",
    cta: { label: "Browse jobs", to: "/jobs" },
    secondary: { label: "Create free account", to: "/auth", search: { mode: "signup" } },
  },
  {
    icon: ListChecks, name: "Application Tracker", level: "login-required",
    desc: "Pipeline from Saved → Offer with reminders and analytics. Requires an account.",
    cta: { label: "Sign up to Track Applications", to: "/auth", search: { mode: "signup" } },
    secondary: { label: "View sample", to: "/demo" },
  },
  {
    icon: MessagesSquare, name: "Interview Prep", level: "pro-feature",
    desc: "Company-specific prep, STAR builder, mock recruiter screens, salary negotiation.",
    cta: { label: "Upgrade to Pro", to: "/pricing" },
    secondary: { label: "See preview", to: "/demo" },
  },
  {
    icon: Compass, name: "Career Coach", level: "pro-feature",
    desc: "An always-on AI assistant that plans your week, rewrites CVs, and drafts recruiter messages.",
    cta: { label: "Upgrade to Pro", to: "/pricing" },
  },
];

const teamModules: ModuleCard[] = [
  {
    icon: Building, name: "Recruiter Intelligence", level: "recruiter-plan",
    desc: "AI shortlisting, candidate search, recruiter messaging, and pipeline analytics.",
    cta: { label: "View Recruiter Plans", to: "/for-recruiters" },
    secondary: { label: "View pricing", to: "/pricing" },
  },
  {
    icon: ShieldCheck, name: "Trust & Safety", level: "platform-feature",
    desc: "Verified employers, fraud detection, and transparent scoring you can audit.",
    cta: { label: "Learn More", to: "/product" as never },
  },
];


function ProductPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-4 pt-16 pb-10 text-center sm:px-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Product</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          A career operating system, not a job board
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Eight modules built to answer one question: <em>"Where should I apply today, and what
          should I fix before applying?"</em> Try what's free, sign up to track, upgrade for the full edge.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>Start Free<ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/demo">Preview Dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link to="/pricing">View Pricing</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {modules.map((m) => <ModuleCardView key={m.name} m={m} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">For Teams & Platform</div>
        <div className="grid gap-5 sm:grid-cols-2">
          {teamModules.map((m) => <ModuleCardView key={m.name} m={m} />)}
        </div>
      </section>
    </MarketingShell>
  );
}

function ModuleCardView({ m }: { m: ModuleCard }) {
  const Icon = m.icon;
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <AccessBadge level={m.level} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{m.name}</h2>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{m.desc}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link to={m.cta.to as any} search={m.cta.search as any}>
            {m.cta.label}<ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        {m.secondary && (
          <Button asChild size="sm" variant="ghost">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link to={m.secondary.to as any} search={m.secondary.search as any}>{m.secondary.label}</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
