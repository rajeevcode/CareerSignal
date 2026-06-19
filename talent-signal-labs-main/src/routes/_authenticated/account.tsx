import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/cs/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getMyPlan, cancelProPlaceholder } from "@/lib/billing.functions";
import { FREE_LIMITS, PRO_PRICE_LABEL, PRO_CADENCE_LABEL } from "@/lib/billing";
import { Sparkles, Crown, ArrowRight, Sun, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/cs/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account — CareerSignal" }] }),
  component: () => (
    <AppShell>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <AccountInner />
      </Suspense>
    </AppShell>
  ),
});

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{used} / {max}</span>
      </div>
      <Progress value={pct} className="mt-1.5 h-2" />
    </div>
  );
}

function AccountInner() {
  const fn = useServerFn(getMyPlan);
  const cancelFn = useServerFn(cancelProPlaceholder);
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: ["my-plan"], queryFn: () => fn() });
  const cancel = useMutation({
    mutationFn: () => cancelFn(),
    onSuccess: () => {
      toast.success("Pro cancelled — you're back on the Free plan.");
      qc.invalidateQueries({ queryKey: ["my-plan"] });
    },
  });

  const isPro = data.plan === "pro";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.email ?? "Signed in"}</p>
      </header>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current plan
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {isPro ? "CareerSignal Pro" : "Free"}
              </span>
              {isPro && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  <Crown className="h-3 w-3" /> Pro
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPro
                ? "All features unlocked. Thanks for supporting CareerSignal."
                : "Start free, upgrade when you're ready to apply seriously."}
            </p>
          </div>
          {isPro ? (
            <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              {cancel.isPending ? "Cancelling…" : "Cancel subscription"}
            </Button>
          ) : (
            <Button asChild>
              <Link to="/checkout">
                <Sparkles className="h-4 w-4" /> Upgrade to Pro — {PRO_PRICE_LABEL}{PRO_CADENCE_LABEL}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Usage this month</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <UsageBar label="CV uploads" used={data.usage.cv_upload_count} max={isPro ? Math.max(data.usage.cv_upload_count, FREE_LIMITS.cvUploads) : FREE_LIMITS.cvUploads} />
          <UsageBar label="JD matches" used={data.usage.jd_match_count_monthly} max={isPro ? Math.max(data.usage.jd_match_count_monthly, FREE_LIMITS.jdMatchesMonthly) : FREE_LIMITS.jdMatchesMonthly} />
          <UsageBar label="Saved jobs" used={data.usage.saved_jobs_count} max={isPro ? Math.max(data.usage.saved_jobs_count, FREE_LIMITS.savedJobs) : FREE_LIMITS.savedJobs} />
          <UsageBar label="Tracked applications" used={data.usage.tracked_applications_count} max={isPro ? Math.max(data.usage.tracked_applications_count, FREE_LIMITS.trackedApplications) : FREE_LIMITS.trackedApplications} />
        </div>
        {!isPro && (
          <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            Hitting limits? <Link to="/checkout" className="font-semibold text-primary hover:underline">Upgrade to Pro</Link> for unlimited everything.
          </div>
        )}
      </Card>

      <ThemeCard />
    </div>
  );
}

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light" as const, label: "Light", icon: Sun, desc: "Bright, paper-white surfaces." },
    { value: "dark" as const, label: "Dark", icon: Moon, desc: "Low-glare, evening-friendly." },
    { value: "system" as const, label: "System", icon: Monitor, desc: "Match your OS setting." },
  ];
  const handle = (v: "light" | "dark" | "system") => {
    if (v === "system") {
      try { window.localStorage.removeItem("cs-theme"); } catch {}
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      toast.success("Theme set to system");
      return;
    }
    setTheme(v);
    toast.success(`Theme set to ${v}`);
  };
  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Theme</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose how CareerSignal looks on this device.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {options.map((o) => {
          const active = o.value !== "system" && theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => handle(o.value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-card hover:bg-accent/40",
              )}
              aria-pressed={active}
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                <o.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-foreground">{o.label}</span>
              <span className="text-xs text-muted-foreground">{o.desc}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
