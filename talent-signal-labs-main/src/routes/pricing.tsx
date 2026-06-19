import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CareerSignal" },
      { name: "description", content: "Free for candidates to get started. Pro plans for power users, recruiters, and university career centers." },
      { property: "og:title", content: "Pricing — CareerSignal" },
      { property: "og:description", content: "Simple, transparent pricing across candidates, recruiters, and career centers." },
    ],
  }),
  component: PricingPage,
});

type Audience = "candidate" | "recruiter" | "university";

const plans: Record<Audience, Array<{
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
  cta: string;
  highlight?: boolean;
  features: string[];
}>> = {
  candidate: [
    {
      name: "Free",
      price: "$0",
      blurb: "For trying CareerSignal.",
      cta: "Create free account",
      features: [
        "1 CV upload",
        "Basic CV Score",
        "3 JD matches / month",
        "Save up to 5 jobs",
        "Basic application tracker",
        "Limited interview prep preview",
      ],
    },
    {
      name: "Pro",
      price: "$9",
      cadence: "/ month",
      blurb: "For active job seekers who want every edge.",
      cta: "Upgrade to Pro",
      highlight: true,
      features: [
        "Unlimited CV scoring",
        "Unlimited JD matching",
        "Advanced shortlisting probability",
        "AI bullet & summary rewrite",
        "Multiple role-specific CV versions",
        "Full application analytics",
        "Interview prep & STAR builder",
        "Career Coach AI assistant",
        "Priority job alerts",
        "Export optimized CV (PDF/DOCX)",
      ],
    },
  ],
  recruiter: [
    {
      name: "Starter",
      price: "$19",
      cadence: "/ month",
      blurb: "For small teams posting a handful of roles.",
      cta: "Start Starter",
      features: ["Up to 3 active jobs", "Basic applicant management", "JD quality score"],
    },
    {
      name: "Recruit",
      price: "$49",
      cadence: "/ month",
      blurb: "For active hiring teams.",
      cta: "Start Recruit",
      highlight: true,
      features: [
        "Unlimited active jobs",
        "AI candidate shortlisting",
        "Candidate database access",
        "Featured jobs",
        "Recruiter messaging",
        "Pipeline analytics",
      ],
    },
  ],
  university: [
    {
      name: "Career Center",
      price: "Custom",
      blurb: "For universities and career service teams.",
      cta: "Contact sales",
      features: [
        "Student dashboards",
        "Resume review automation",
        "Career outcome analytics",
        "Employer engagement tools",
        "Admin reporting",
      ],
    },
  ],
};

function PricingPage() {
  const [audience, setAudience] = useState<Audience>("candidate");
  const items = plans[audience];

  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-4 pt-16 pb-8 text-center sm:px-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Pricing</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Pricing that fits your career stage
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Candidates start free. Teams and career centers pay for outcomes.
        </p>

        <div className="mt-7 inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
          {(["candidate", "recruiter", "university"] as Audience[]).map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                audience === a
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {a === "university" ? "Career Center" : a}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className={cn("grid gap-5", items.length === 1 ? "mx-auto max-w-md" : "sm:grid-cols-2")}>
          {items.map((p) => (
            <div
              key={p.name}
              className={cn(
                "rounded-2xl border bg-card p-7 shadow-[var(--shadow-card)]",
                p.highlight ? "border-primary/40 shadow-[var(--shadow-elegant)] ring-2 ring-primary/10" : "border-border",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{p.name}</h2>
                {p.highlight && (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">{p.price}</span>
                {p.cadence && <span className="text-sm text-muted-foreground">{p.cadence}</span>}
              </div>
              <Button asChild className="mt-5 w-full" variant={p.highlight ? "default" : "outline"}>
                <Link
                  to={p.name === "Pro" ? "/checkout" : p.name === "Free" ? "/auth" : "/auth"}
                  search={p.name === "Pro" ? undefined : { mode: "signup" as const }}
                >
                  {p.cta}<ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
