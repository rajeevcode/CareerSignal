import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { diffLines, type Change } from "diff";
import { toast } from "sonner";
import { History, Trash2, FileText, ArrowLeftRight } from "lucide-react";
import { AppShell } from "@/components/cs/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  listCvVersions,
  deleteCvVersion,
  type CvVersion,
} from "@/lib/cv-versions.functions";

export const Route = createFileRoute("/_authenticated/cv-versions")({
  head: () => ({
    meta: [
      { title: "CV Version History — CareerSignal" },
      { name: "description", content: "Compare every CV revision side-by-side with line-level diffs." },
    ],
  }),
  component: CvVersionsPage,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn't load versions</h2>
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

function CvVersionsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCvVersions);
  const delFn = useServerFn(deleteCvVersion);

  const { data: versions, isLoading } = useQuery({
    queryKey: ["cv-versions"],
    queryFn: () => listFn(),
  });

  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  useEffect(() => {
    if (!versions || versions.length === 0) return;
    if (!rightId) setRightId(versions[0].id);
    if (!leftId && versions.length > 1) setLeftId(versions[1].id);
    else if (!leftId) setLeftId(versions[0].id);
  }, [versions, leftId, rightId]);

  const left = versions?.find((v) => v.id === leftId) ?? null;
  const right = versions?.find((v) => v.id === rightId) ?? null;

  const changes: Change[] = useMemo(() => {
    if (!left || !right) return [];
    return diffLines(left.raw_text ?? "", right.raw_text ?? "");
  }, [left, right]);

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: (_, id) => {
      if (leftId === id) setLeftId(null);
      if (rightId === id) setRightId(null);
      qc.invalidateQueries({ queryKey: ["cv-versions"] });
      toast.success("Version deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    let add = 0, rem = 0;
    for (const c of changes) {
      const lines = (c.value.match(/\n/g)?.length ?? 0) + (c.value.endsWith("\n") ? 0 : 1);
      if (c.added) add += lines;
      else if (c.removed) rem += lines;
    }
    return { add, rem };
  }, [changes]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">CV Version History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every CV revision is saved. Pick any two to see what changed, line by line.
          </p>
        </header>

        {isLoading && <Skeleton className="h-96" />}

        {!isLoading && versions && versions.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No CV versions yet. Complete onboarding to upload your first CV.
          </Card>
        )}

        {!isLoading && versions && versions.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-2">
              <p className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Versions
              </p>
              {versions.map((v) => (
                <VersionRow
                  key={v.id}
                  v={v}
                  isLeft={leftId === v.id}
                  isRight={rightId === v.id}
                  onPickLeft={() => setLeftId(v.id)}
                  onPickRight={() => setRightId(v.id)}
                  onDelete={() => del.mutate(v.id)}
                  canDelete={versions.length > 1}
                />
              ))}
            </aside>

            <section className="space-y-3">
              <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">v{left?.version_number ?? "?"}</Badge>
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <Badge>v{right?.version_number ?? "?"}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600">+{stats.add}</span>
                  <span className="text-rose-600">−{stats.rem}</span>
                  <span className="text-muted-foreground">lines</span>
                </div>
              </Card>

              {left && right ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <VersionPanel title="Older" v={left} changes={changes} side="old" />
                  <VersionPanel title="Newer" v={right} changes={changes} side="new" />
                </div>
              ) : (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Pick a version on the left and right to compare.
                </Card>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function VersionRow({
  v,
  isLeft,
  isRight,
  onPickLeft,
  onPickRight,
  onDelete,
  canDelete,
}: {
  v: CvVersion;
  isLeft: boolean;
  isRight: boolean;
  onPickLeft: () => void;
  onPickRight: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 transition",
        (isLeft || isRight) && "border-primary",
        !isLeft && !isRight && "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold">v{v.version_number}</span>
            <Badge variant="secondary" className="text-[10px] capitalize">{v.source.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {v.note ?? v.file_name ?? "—"}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {new Date(v.created_at).toLocaleString()}
          </p>
        </div>
        {canDelete && (
          <button onClick={onDelete} className="text-muted-foreground transition hover:text-rose-500" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-1">
        <Button
          size="sm"
          variant={isLeft ? "default" : "outline"}
          className="h-7 flex-1 text-[11px]"
          onClick={onPickLeft}
        >
          Older
        </Button>
        <Button
          size="sm"
          variant={isRight ? "default" : "outline"}
          className="h-7 flex-1 text-[11px]"
          onClick={onPickRight}
        >
          Newer
        </Button>
      </div>
    </div>
  );
}

function VersionPanel({
  title,
  v,
  changes,
  side,
}: {
  title: string;
  v: CvVersion;
  changes: Change[];
  side: "old" | "new";
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-muted/40 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="text-sm font-semibold">v{v.version_number} · {v.note ?? v.file_name ?? "—"}</p>
      </div>
      <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap p-3 font-mono text-[12px] leading-relaxed">
        {changes.map((c, i) => {
          if (c.added && side === "old") return null;
          if (c.removed && side === "new") return null;
          const cls = c.added
            ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            : c.removed
            ? "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            : "text-foreground";
          const marker = c.added ? "+ " : c.removed ? "− " : "  ";
          return (
            <span key={i} className={cn("block", cls)}>
              {c.value.split("\n").map((line, j, arr) =>
                j === arr.length - 1 && line === "" ? null : (
                  <span key={j} className="block">{marker}{line}</span>
                ),
              )}
            </span>
          );
        })}
        {changes.length === 0 && <span className="text-muted-foreground">No differences.</span>}
      </pre>
    </Card>
  );
}
