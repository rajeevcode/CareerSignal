import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  Activity,
  FileText,
  Target,
  Briefcase,
  Inbox,
  Bell,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/cs/app-shell";
import { MetricCard } from "@/components/cs/metric-card";
import { JobMatchCard } from "@/components/cs/job-match-card";
import { ScoreRing } from "@/components/cs/score-ring";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard, type DashboardJob } from "@/lib/dashboard.functions";
import { getOnboardingStatus } from "@/lib/cv.functions";
import { saveJobToPipeline } from "@/lib/applications.functions";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePaywall, parsePaywallError } from "@/components/cs/paywall-modal";


export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard — CareerSignal" }] }),
  component: AppPage,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn't load your dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </Card>
    </AppShell>
  ),
});

function AppPage() {
  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardInner />
      </Suspense>
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

function DashboardInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const statusFn = useServerFn(getOnboardingStatus);
  const dashFn = useServerFn(getDashboard);

  const status = useSuspenseQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => statusFn(),
  });

  if (!status.data.completed) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">Let's set up your CareerSignal.</h2>
        <p className="mt-1 text-sm text-muted-foreground">It takes about 3 minutes — upload your CV, pick your target, get scored.</p>
        <Button size="lg" className="mt-6" asChild>
          <Link to="/onboarding">
            Start onboarding <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>
    );
  }

  const dash = useSuspenseQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashFn(),
  });

  const d = dash.data;
  const name = d.profile.full_name?.split(" ")[0] ?? "there";
  const score = d.latestScore;
  const savedJobIds = new Set<string>(); // dashboard payload doesn't include job_ids; saved state shows post-mutation.

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Good to see you, {name}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {d.profile.target_role
              ? `Tracking signal for ${d.profile.target_role}.`
              : "Set a target role to sharpen your matches."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { qc.invalidateQueries({ queryKey: ["dashboard"] }); router.invalidate(); }}>
          Refresh
        </Button>
      </header>

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Career Health" value={`${d.metrics.careerHealth}`} hint="Composite signal" icon={Activity} tone="info" />
        <MetricCard label="CV Score" value={`${d.metrics.cvScore}`} hint="Latest analysis" icon={FileText} tone={d.metrics.cvScore >= 75 ? "success" : "warning"} />
        <MetricCard label="Best Role Fit" value={`${d.metrics.bestRoleFit}%`} hint="vs your target" icon={Target} tone="info" />
        <MetricCard label="High-Match Jobs" value={d.metrics.highMatchJobs} hint="≥ 75% match" icon={Briefcase} tone="success" />
        <MetricCard label="Apps This Month" value={d.metrics.applicationsThisMonth} hint="Track in pipeline" icon={Inbox} />
        <MetricCard label="Follow-ups Due" value={d.metrics.followUpsDue} hint="Stay top of mind" icon={Bell} tone="warning" />
      </section>

      {/* CV Score + Next Best Actions */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center gap-4 p-6 lg:col-span-1">
          <h2 className="self-start text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your CV Score</h2>
          <ScoreRing value={score?.overall ?? 0} size={180} />
          <p className="text-center text-sm text-muted-foreground">
            {score?.summary ?? "Upload a CV to get scored."}
          </p>
          {score && (
            <div className="grid w-full grid-cols-2 gap-2 text-xs">
              {Object.entries(score.sub_scores).slice(0, 8).map(([k, v]) => (
                <div key={k} className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
                  <div className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</div>
                  <div className="font-semibold text-foreground">{v}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today's Next Best Actions</h2>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <ul className="mt-4 space-y-3">
            {(score?.improvements ?? [
              "Upload your CV to unlock your personalized action plan.",
            ]).slice(0, 5).map((imp, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground">{imp}</span>
              </li>
            ))}
          </ul>
          {score && score.strengths.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">What's working</div>
              <ul className="mt-2 space-y-1.5">
                {score.strengths.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>

      {/* High-fit jobs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">High-fit jobs for you</h2>
          <span className="text-xs text-muted-foreground">Estimated match — not guaranteed</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {d.jobs.slice(0, 6).map((j) => (
            <JobMatchCardWithSave key={j.id} job={j} savedIds={savedJobIds} />
          ))}
          {d.jobs.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground md:col-span-2">
              No jobs yet. Try widening your markets or check back soon.
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function JobMatchCardWithSave({
  job,
  savedIds,
}: {
  job: DashboardJob;
  savedIds: Set<string>;
}) {
  const saveFn = useServerFn(saveJobToPipeline);
  const qc = useQueryClient();
  const paywall = usePaywall();
  const mutation = useMutation({
    mutationFn: (j: DashboardJob) =>
      saveFn({ data: { job_id: j.id, match_score: j.match } }),
    onSuccess: (res) => {
      toast.success(res.created ? "Saved to pipeline" : "Already in your pipeline");
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["my-plan"] });
    },
    onError: (err) => {
      const pw = parsePaywallError(err);
      if (pw) return paywall.open(pw);
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    },
  });

  return (
    <JobMatchCard
      job={job}
      onSave={(j) => mutation.mutate(j)}
      saving={mutation.isPending}
      saved={savedIds.has(job.id) || (mutation.isSuccess && !mutation.data?.created === false)}
    />
  );
}
