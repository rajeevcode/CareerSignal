import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Sparkles, ListChecks, Download } from "lucide-react";
import { AppShell } from "@/components/cs/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { runAtsCheck, type AtsReport, type AtsCheckItem } from "@/lib/ats-checker.functions";
import { exportAtsReportPdf } from "@/lib/ats-pdf";

export const Route = createFileRoute("/_authenticated/ats-check")({
  head: () => ({
    meta: [
      { title: "ATS Compliance Checker — CareerSignal" },
      { name: "description", content: "Scan your CV for ATS compliance and get a prioritized checklist of fixes." },
    ],
  }),
  component: AtsCheckPage,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn't load ATS Checker</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </Card>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell><Card className="p-8 text-center text-sm text-muted-foreground">Not found.</Card></AppShell>
  ),
});

const CATEGORIES: Array<{ key: AtsCheckItem["category"]; label: string }> = [
  { key: "structure", label: "Section Structure" },
  { key: "formatting", label: "Formatting" },
  { key: "contact", label: "Contact" },
  { key: "content", label: "Content Quality" },
  { key: "keywords", label: "Keywords" },
];

function StatusIcon({ s }: { s: AtsCheckItem["status"] }) {
  if (s === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (s === "warn") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function AtsCheckPage() {
  const runFn = useServerFn(runAtsCheck);
  const [jdText, setJdText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [report, setReport] = useState<AtsReport | null>(null);

  const run = useMutation({
    mutationFn: () =>
      runFn({ data: { jdText: jdText.trim() || undefined, targetRole: targetRole.trim() || undefined } }),
    onSuccess: (r) => {
      setReport(r);
      toast.success(`ATS scan complete — ${r.score}/100`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = report
    ? report.checks.reduce(
        (acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }),
        { pass: 0, warn: 0, fail: 0 } as Record<AtsCheckItem["status"], number>,
      )
    : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ShieldCheck className="h-6 w-6 text-primary" />
              ATS Compliance Checker
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan your primary CV against ATS parsers. Get a checklist with fixes for formatting, keywords, and structure.
            </p>
          </div>
          <Link to="/cv-doctor" className="text-sm text-primary hover:underline">CV Doctor →</Link>
        </div>

        <Card className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Target role (optional)</label>
              <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Senior Product Designer" />
            </div>
            <div className="sm:row-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Paste a job description (optional)</label>
              <Textarea value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste a JD to calibrate keywords…" className="min-h-[110px]" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => run.mutate()} disabled={run.isPending} className="w-full sm:w-auto">
                <Sparkles className="mr-2 h-4 w-4" />
                {run.isPending ? "Scanning…" : "Run ATS scan"}
              </Button>
            </div>
          </div>
        </Card>

        {run.isPending && (
          <Card className="p-5 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-32 w-full" />
          </Card>
        )}

        {report && (
          <>
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex-1 min-w-[220px]">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">ATS score</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-semibold">{report.score}</span>
                    <span className="text-muted-foreground">/100</span>
                  </div>
                  <Progress value={report.score} className="mt-3" />
                </div>
                {counts && (
                  <div className="flex gap-3 text-sm">
                    <Badge variant="outline" className="gap-1 border-emerald-500/40">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {counts.pass} pass
                    </Badge>
                    <Badge variant="outline" className="gap-1 border-amber-500/40">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> {counts.warn} warn
                    </Badge>
                    <Badge variant="outline" className="gap-1 border-red-500/40">
                      <XCircle className="h-3.5 w-3.5 text-red-500" /> {counts.fail} fail
                    </Badge>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      exportAtsReportPdf(report, { targetRole: targetRole.trim() || undefined });
                      toast.success("PDF downloaded");
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" /> Export report
                </Button>
              </div>
              {report.summary && <p className="mt-4 text-sm text-muted-foreground">{report.summary}</p>}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                <Stat label="Words" value={report.stats.wordCount} />
                <Stat label="Bullets" value={report.stats.bulletCount} />
                <Stat label="Action-verb %" value={Math.round(report.stats.actionVerbsRatio * 100) + "%"} />
                <Stat label="Quantified" value={report.stats.quantifiedBullets} />
              </div>
            </Card>

            {report.topFixes.length > 0 && (
              <Card className="p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ListChecks className="h-4 w-4 text-primary" /> Top fixes (priority order)
                </h2>
                <ol className="mt-3 space-y-2 text-sm">
                  {report.topFixes.map((f, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{i + 1}</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {report.keywordSuggestions.length > 0 && (
              <Card className="p-5">
                <h2 className="text-sm font-semibold">Suggested keywords</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Weave these naturally into your Skills and Experience sections where truthful.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.keywordSuggestions.map((k) => (
                    <Badge key={k} variant="secondary">{k}</Badge>
                  ))}
                </div>
              </Card>
            )}

            <div className="space-y-4">
              {CATEGORIES.map((cat) => {
                const items = report.checks.filter((c) => c.category === cat.key);
                if (items.length === 0) return null;
                return (
                  <Card key={cat.key} className="p-5">
                    <h3 className="mb-3 text-sm font-semibold">{cat.label}</h3>
                    <ul className="space-y-3">
                      {items.map((c) => (
                        <li key={c.id} className="rounded-md border border-border/60 p-3">
                          <div className="flex items-start gap-2">
                            <StatusIcon s={c.status} />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{c.label}</div>
                              <div className="text-xs text-muted-foreground">{c.detail}</div>
                              {c.fix && (
                                <div className="mt-2 rounded bg-muted/50 px-2 py-1.5 text-xs">
                                  <span className="font-semibold text-foreground">Fix: </span>
                                  <span className="text-muted-foreground">{c.fix}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {!report && !run.isPending && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Click <span className="font-medium text-foreground">Run ATS scan</span> to audit your primary CV.
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}
