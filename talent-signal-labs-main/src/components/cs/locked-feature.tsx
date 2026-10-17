import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type AccessLevel =
  | "free-preview"
  | "login-required"
  | "pro-feature"
  | "recruiter-plan"
  | "platform-feature"
  | "coming-soon";

const BADGE_STYLES: Record<AccessLevel, { label: string; cls: string }> = {
  "free-preview": { label: "Free Preview", cls: "bg-success-soft text-success border-success/30" },
  "login-required": { label: "Login Required", cls: "bg-primary/10 text-primary border-primary/30" },
  "pro-feature": {
    label: "Pro Feature",
    cls: "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
  },
  "recruiter-plan": { label: "Recruiter Plan", cls: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
  "platform-feature": { label: "Platform", cls: "bg-muted text-muted-foreground border-border" },
  "coming-soon": { label: "Coming Soon", cls: "bg-muted text-muted-foreground border-border" },
};

export function AccessBadge({ level, className }: { level: AccessLevel; className?: string }) {
  const s = BADGE_STYLES[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        s.cls,
        className,
      )}
    >
      {level === "pro-feature" && <Sparkles className="h-2.5 w-2.5" />}
      {level === "login-required" && <Lock className="h-2.5 w-2.5" />}
      {s.label}
    </span>
  );
}

type LockedFeatureProps = {
  title: string;
  description: string;
  level: AccessLevel;
  /** Blurred preview content shown behind the overlay. */
  preview?: ReactNode;
  primaryLabel?: string;
  /** Override the default link target. Defaults to /auth (signup) for guests or /pricing for Pro. */
  primaryTo?: "/auth" | "/pricing" | "/for-recruiters";
  primarySearch?: { mode: "signin" | "signup" };
  secondaryLabel?: string;
  secondaryTo?: "/pricing" | "/product" | "/for-recruiters" | "/auth";
  secondarySearch?: { mode: "signin" | "signup" };
  className?: string;
};

const DEFAULTS: Record<
  AccessLevel,
  { primary: { label: string; to: "/auth" | "/pricing" | "/for-recruiters"; search?: { mode: "signin" | "signup" } }; secondary?: { label: string; to: "/pricing" | "/product" | "/for-recruiters" | "/auth"; search?: { mode: "signin" | "signup" } } }
> = {
  "free-preview": {
    primary: { label: "Create free account", to: "/auth", search: { mode: "signup" } },
    secondary: { label: "View pricing", to: "/pricing" },
  },
  "login-required": {
    primary: { label: "Create free account", to: "/auth", search: { mode: "signup" } },
    secondary: { label: "Log in", to: "/auth", search: { mode: "signin" } },
  },
  "pro-feature": {
    primary: { label: "Upgrade to Pro", to: "/pricing" },
    secondary: { label: "Create free account", to: "/auth", search: { mode: "signup" } },
  },
  "recruiter-plan": {
    primary: { label: "View recruiter plans", to: "/for-recruiters" },
    secondary: { label: "View pricing", to: "/pricing" },
  },
  "platform-feature": {
    primary: { label: "Learn more", to: "/product" as never },
  } as never,
  "coming-soon": {
    primary: { label: "Notify me", to: "/auth", search: { mode: "signup" } },
  },
};

export function LockedFeature({
  title,
  description,
  level,
  preview,
  primaryLabel,
  primaryTo,
  primarySearch,
  secondaryLabel,
  secondaryTo,
  secondarySearch,
  className,
}: LockedFeatureProps) {
  const d = DEFAULTS[level];
  const primary = {
    label: primaryLabel ?? d.primary.label,
    to: primaryTo ?? d.primary.to,
    search: primarySearch ?? d.primary.search,
  };
  const secondary = secondaryLabel
    ? { label: secondaryLabel, to: secondaryTo ?? "/pricing", search: secondarySearch }
    : d.secondary
    ? { label: d.secondary.label, to: d.secondary.to, search: d.secondary.search }
    : null;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]", className)}>
      {preview && (
        <div className="pointer-events-none select-none blur-[6px] saturate-[0.85] opacity-70" aria-hidden>
          {preview}
        </div>
      )}
      <div
        className={cn(
          "inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center",
          preview ? "absolute bg-gradient-to-b from-background/60 via-background/85 to-background/95" : "relative",
        )}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <AccessBadge level={level} />
        <h3 className="max-w-md text-lg font-semibold text-foreground">{title}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="sm">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link to={primary.to as any} search={primary.search as any}>
              {primary.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {secondary && (
            <Button asChild size="sm" variant="ghost">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link to={secondary.to as any} search={secondary.search as any}>
                {secondary.label}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Inline nudge for places like "0 of 3 JD matches remaining" or "Save this job (login required)". */
export function UpgradeNudge({
  level,
  message,
  ctaLabel,
  ctaTo = "/auth",
  ctaSearch = { mode: "signup" },
  className,
}: {
  level: AccessLevel;
  message: string;
  ctaLabel: string;
  ctaTo?: "/auth" | "/pricing" | "/for-recruiters";
  ctaSearch?: { mode: "signin" | "signup" };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <AccessBadge level={level} />
        <span>{message}</span>
      </div>
      <Button asChild size="sm" variant="outline">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link to={ctaTo as any} search={ctaSearch as any}>
          {ctaLabel}
        </Link>
      </Button>
    </div>
  );
}
