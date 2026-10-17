import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { Briefcase, MapPin, Trash2, GripVertical } from "lucide-react";
import { AppShell } from "@/components/cs/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listApplications,
  updateApplicationStatus,
  deleteApplication,
  PIPELINE_STATUSES,
  type PipelineApplication,
  type PipelineStatus,
} from "@/lib/applications.functions";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — CareerSignal" }] }),
  component: PipelinePage,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn't load your pipeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </Card>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <Card className="p-8 text-center text-sm text-muted-foreground">Not found.</Card>
    </AppShell>
  ),
});

const COLUMN_META: Record<PipelineStatus, { label: string; tone: string; description: string }> = {
  saved: { label: "Saved", tone: "border-l-slate-400", description: "Shortlisted to apply" },
  applied: { label: "Applied", tone: "border-l-blue-500", description: "Application submitted" },
  interview: { label: "Interview", tone: "border-l-violet-500", description: "Talking to the team" },
  offer: { label: "Offer", tone: "border-l-emerald-500", description: "Decision time" },
  rejected: { label: "Closed", tone: "border-l-rose-500", description: "Archived or rejected" },
};

function PipelinePage() {
  return (
    <AppShell>
      <Suspense fallback={<BoardSkeleton />}>
        <BoardInner />
      </Suspense>
    </AppShell>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-1/3" />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}

function BoardInner() {
  const qc = useQueryClient();
  const listFn = useServerFn(listApplications);
  const updateFn = useServerFn(updateApplicationStatus);
  const deleteFn = useServerFn(deleteApplication);

  const { data } = useSuspenseQuery({
    queryKey: ["pipeline"],
    queryFn: () => listFn(),
  });

  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<PipelineStatus | null>(null);

  const grouped = useMemo(() => {
    const g: Record<PipelineStatus, PipelineApplication[]> = {
      saved: [], applied: [], interview: [], offer: [], rejected: [],
    };
    for (const app of data) g[app.status].push(app);
    return g;
  }, [data]);

  async function moveTo(id: string, status: PipelineStatus) {
    const prev = qc.getQueryData<PipelineApplication[]>(["pipeline"]) ?? [];
    qc.setQueryData<PipelineApplication[]>(["pipeline"], (rows) =>
      (rows ?? []).map((r) => (r.id === id ? { ...r, status } : r)),
    );
    try {
      await updateFn({ data: { id, status } });
      toast.success(`Moved to ${COLUMN_META[status].label}`);
    } catch (err) {
      qc.setQueryData(["pipeline"], prev);
      toast.error(err instanceof Error ? err.message : "Couldn't update status");
    }
  }

  async function remove(id: string) {
    const prev = qc.getQueryData<PipelineApplication[]>(["pipeline"]) ?? [];
    qc.setQueryData<PipelineApplication[]>(["pipeline"], (rows) =>
      (rows ?? []).filter((r) => r.id !== id),
    );
    try {
      await deleteFn({ data: { id } });
      toast.success("Removed from pipeline");
    } catch (err) {
      qc.setQueryData(["pipeline"], prev);
      toast.error(err instanceof Error ? err.message : "Couldn't remove");
    }
  }

  const total = data.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Application pipeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total === 0
              ? "Save jobs from your dashboard to start tracking them here."
              : `Tracking ${total} ${total === 1 ? "opportunity" : "opportunities"}. Drag cards to move between stages.`}
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {PIPELINE_STATUSES.map((status) => {
          const meta = COLUMN_META[status];
          const items = grouped[status];
          const isHover = hoverCol === status;
          return (
            <section
              key={status}
              onDragOver={(e) => { e.preventDefault(); setHoverCol(status); }}
              onDragLeave={() => setHoverCol((c) => (c === status ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setHoverCol(null);
                if (dragId) {
                  const current = data.find((d) => d.id === dragId);
                  if (current && current.status !== status) void moveTo(dragId, status);
                }
                setDragId(null);
              }}
              className={`flex min-h-[420px] flex-col rounded-xl border bg-card/40 p-3 transition-colors ${isHover ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <header className={`mb-3 flex items-center justify-between border-l-4 pl-3 ${meta.tone}`}>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{meta.label}</h2>
                  <p className="text-[11px] text-muted-foreground">{meta.description}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {items.length}
                </span>
              </header>

              <div className="flex flex-1 flex-col gap-2">
                {items.map((app) => (
                  <article
                    key={app.id}
                    draggable
                    onDragStart={() => setDragId(app.id)}
                    onDragEnd={() => { setDragId(null); setHoverCol(null); }}
                    className={`group cursor-grab rounded-lg border border-border bg-background p-3 shadow-sm transition active:cursor-grabbing ${dragId === app.id ? "opacity-50" : "hover:border-primary/40 hover:shadow"}`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {app.job_title ?? "Untitled role"}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {app.company ?? "Unknown company"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          {app.job_location && (
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{app.job_location}</span>
                          )}
                          {app.match_score != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                              <Briefcase className="h-3 w-3" />{app.match_score}%
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void remove(app.id)}
                        aria-label="Remove from pipeline"
                        className="opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>

                    {/* Mobile-friendly stage switcher */}
                    <div className="mt-3 flex flex-wrap gap-1 md:hidden">
                      {PIPELINE_STATUSES.filter((s) => s !== app.status).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void moveTo(app.id, s)}
                          className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent"
                        >
                          → {COLUMN_META[s].label}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}

                {items.length === 0 && (
                  <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                    Drop cards here
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
