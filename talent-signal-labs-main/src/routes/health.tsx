import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Signal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHealth } from "@/lib/health.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "System status — CareerSignal" },
      { name: "description", content: "Live status of CareerSignal auth, database, and AI." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HealthPage,
});

function HealthPage() {
  const getHealthFn = useServerFn(getHealth);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["health"],
    queryFn: () => getHealthFn(),
    refetchOnWindowFocus: false,
  });

  const overallOk = data?.ok === true;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Signal className="h-4 w-4" strokeWidth={2.5} />
            </span>
            CareerSignal
          </Link>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", isFetching && "animate-spin")} />
            Re-check
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">System status</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live check of authentication, database, and AI gateway. Also available as JSON at{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/health</code>.
          </p>
        </div>

        <Card
          className={cn(
            "flex items-center gap-3 border-2 p-5",
            overallOk
              ? "border-emerald-500/30 bg-emerald-500/5"
              : data
                ? "border-red-500/30 bg-red-500/5"
                : "border-border",
          )}
        >
          {!data && isFetching ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : overallOk ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600" />
          )}
          <div>
            <div className="text-sm font-semibold">
              {!data ? "Running checks…" : overallOk ? "All systems operational" : "One or more checks failed"}
            </div>
            {data && (
              <div className="text-xs text-muted-foreground">
                Checked {new Date(data.checkedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        </Card>

        {error && (
          <Card className="border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
            Couldn't reach the health endpoint: {(error as Error).message}
          </Card>
        )}

        <div className="space-y-2">
          {data?.checks.map((c) => (
            <Card key={c.name} className="flex items-start gap-3 p-4">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.ms} ms</span>
                </div>
                <div className="text-sm text-muted-foreground">{c.detail}</div>
              </div>
            </Card>
          ))}
          {!data &&
            ["Auth config", "Database", "AI Gateway"].map((n) => (
              <Card key={n} className="flex items-center gap-3 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{n}…</span>
              </Card>
            ))}
        </div>
      </main>
    </div>
  );
}
