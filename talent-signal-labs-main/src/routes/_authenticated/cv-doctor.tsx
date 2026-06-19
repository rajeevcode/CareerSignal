import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Target,
  FileText,
  TrendingUp,
  Check,
  AlertTriangle,
  History,
  Save,
  RefreshCcw,
  ArrowUpRight,
  Scissors,
  ShieldAlert,
  ClipboardCopy,
} from "lucide-react";
import { AppShell } from "@/components/cs/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  analyzeResume,
  listAnalyses,
  rewriteBullet,
  ROLE_STYLES,
  type BulletFeedback,
  type CvAnalysisRow,
  type RoleStyle,
} from "@/lib/resume-doctor.functions";
import { applyRewritesAsNewVersion } from "@/lib/cv-versions.functions";

export const Route = createFileRoute("/_authenticated/cv-doctor")({
  head: () => ({
    meta: [
      { title: "CV Doctor — CareerSignal" },
      {
        name: "description",
        content:
          "FAANG-grade resume rewrites: every bullet shown with diagnosis, X-Y-Z rewrite, keywords added, and score impact.",
      },
    ],
  }),
  component: CvDoctorPage,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn't load CV Doctor</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={reset}>
          Retry
        </Button>
      </Card>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <Card className="p-8 text-center text-sm text-muted-foreground">Not found.</Card>
    </AppShell>
  ),
});

const ROLE_STYLE_LABELS: Record<RoleStyle, string> = {
  "ai-pm": "AI Product Manager",
  "tech-pm": "Technical Product Manager",
  "data-pm": "Data Product Manager",
  "product-owner": "Product Owner",
  "growth-pm": "Growth Product Manager",
  "program-manager": "Program Manager",
};

function CvDoctorPage() {
  const qc = useQueryClient();
  const analyzeFn = useServerFn(analyzeResume);
  const listFn = useServerFn(listAnalyses);

  const { data: history } = useQuery({
    queryKey: ["cv-analyses"],
    queryFn: () => listFn(),
  });

  const [jdText, setJdText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [roleStyle, setRoleStyle] = useState<RoleStyle>("ai-pm");
  const [current, setCurrent] = useState<CvAnalysisRow | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      analyzeFn({
        data: {
          jdText: jdText.trim() || undefined,
          targetRole: targetRole.trim() || undefined,
          roleStyle,
        },
      }),
    onSuccess: (row) => {
      setCurrent(row);
      qc.invalidateQueries({ queryKey: ["cv-analyses"] });
      toast.success("Analysis complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shown = current ?? history?.[0] ?? null;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CV Doctor</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Every bullet rewritten in FAANG X-Y-Z format: strong verb, ownership,
              measurable outcome, and the mechanism that produced it — plus the
              keywords added and the score lift you'll see.
            </p>
          </div>
        </header>

        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-[1.1fr_2fr]">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Target role (optional)
                </label>
                <Input
                  placeholder="e.g. Senior AI Product Manager"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rewrite style
                </label>
                <Select value={roleStyle} onValueChange={(v) => setRoleStyle(v as RoleStyle)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_STYLES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ROLE_STYLE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Tunes voice, seniority signal, and keyword set.
                </p>
              </div>
              <Button className="w-full gap-2" onClick={() => mut.mutate()} disabled={mut.isPending}>
                <Sparkles className="h-4 w-4" />
                {mut.isPending ? "Analyzing your CV…" : "Run FAANG-grade analysis"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Uses your primary CV from onboarding.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Job description (optional — paste to tailor)
              </label>
              <Textarea
                rows={9}
                placeholder="Paste the JD here for keyword match + tailored bullet rewrites…"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <TruthfulnessCallout />

        {mut.isPending && (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        )}

        {shown && !mut.isPending && (
          <AnalysisView a={shown} roleStyle={roleStyle} jdText={jdText} targetRole={targetRole} />
        )}

        {history && history.length > 1 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Past analyses
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {history.slice(0, 6).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setCurrent(a)}
                  className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{a.match_score ?? "—"}</span>
                    <Badge variant={a.target_jd_text ? "default" : "secondary"}>
                      {a.target_jd_text ? "JD match" : "General"}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.summary}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function TruthfulnessCallout() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Only use metrics and skills you can honestly support in an interview. Rewrites
        marked with <Badge variant="outline" className="mx-1 border-amber-500/50 text-amber-800 dark:text-amber-300">placeholder</Badge>
        contain bracketed values like <code className="rounded bg-amber-500/20 px-1">[X%]</code> or
        <code className="ml-1 rounded bg-amber-500/20 px-1">[N hours/week]</code> that you must verify
        before sending.
      </p>
    </div>
  );
}

function AnalysisView({
  a,
  roleStyle,
  jdText,
  targetRole,
}: {
  a: CvAnalysisRow;
  roleStyle: RoleStyle;
  jdText: string;
  targetRole: string;
}) {
  const current = a.match_score ?? 0;
  const potential = a.potential_match_score ?? Math.min(100, current + 18);
  const ats = a.ats_keyword_match ?? Math.max(0, current - 3);

  return (
    <div className="space-y-5">
      {/* Score header */}
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Improve my CV for this job
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-8">
          <ScoreBlock label="Current JD Match" value={`${current}%`} />
          <span className="pb-3 text-2xl text-muted-foreground">→</span>
          <ScoreBlock label="Potential after rewrite" value={`${potential}%`} tone="success" />
          <ScoreBlock label="ATS keyword match" value={`${ats}%`} />
        </div>

        {a.summary && (
          <p className="mt-4 rounded-md bg-muted/40 p-3 text-sm text-foreground">{a.summary}</p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Target className="h-4 w-4" /> Sub-scores
          </div>
          <div className="mt-3 space-y-3">
            {Object.entries(a.scores ?? {}).map(([k, v]) => (
              <div key={k}>
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
                  <span className="font-semibold">{v}</span>
                </div>
                <Progress value={Number(v) || 0} className="mt-1 h-1.5" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" /> Suggested professional summary
          </div>
          <p className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
            {a.suggested_summary ??
              "Run an analysis to generate a premium, role-tailored professional summary."}
          </p>
          {a.suggested_summary && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(a.suggested_summary!);
                  toast.success("Copied summary");
                }}
              >
                <ClipboardCopy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" /> Weak bullets — FAANG rewrites
          </div>
          <SaveAsVersion analysis={a} />
        </div>

        <div className="space-y-4">
          {(a.bullet_feedback ?? []).map((b, i) => (
            <BulletCard
              key={i}
              bullet={b}
              roleStyle={a.role_style ?? roleStyle}
              jdText={jdText}
              targetRole={targetRole}
            />
          ))}
          {(a.bullet_feedback ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No weak bullets detected — your CV is already in strong shape for this role.
            </p>
          )}
        </div>
      </Card>

      {((a.matched_keywords?.length ?? 0) > 0 || (a.missing_keywords?.length ?? 0) > 0) && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> Keyword signal
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Matched</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(a.matched_keywords ?? []).map((k) => (
                  <Badge key={k} variant="secondary" className="bg-emerald-50 text-emerald-700">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Missing</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(a.missing_keywords ?? []).map((k) => (
                  <Badge key={k} variant="outline" className="border-rose-200 text-rose-700">
                    {k}
                  </Badge>
                ))}
                {(a.missing_keywords ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">None — add a JD to compare.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {(a.suggested_bullets?.length ?? 0) > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Bullets to add
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {(a.suggested_bullets ?? []).map((b, i) => (
              <li key={i} className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                <span className="mt-0.5 text-primary">+</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ScoreBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div>
      <div
        className={`text-4xl font-bold tracking-tight ${
          tone === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function BulletCard({
  bullet,
  roleStyle,
  jdText,
  targetRole,
}: {
  bullet: BulletFeedback;
  roleStyle: RoleStyle;
  jdText: string;
  targetRole: string;
}) {
  const [b, setB] = useState<BulletFeedback>(bullet);
  const [accepted, setAccepted] = useState(false);
  const rewriteFn = useServerFn(rewriteBullet);

  const action = useMutation({
    mutationFn: (mode: "regenerate" | "more-senior" | "more-concise") =>
      rewriteFn({
        data: {
          original: b.original,
          currentRewrite: b.rewrite,
          mode,
          roleStyle,
          targetRole: targetRole || undefined,
          jdText: jdText || undefined,
        },
      }),
    onSuccess: (out) => {
      setB((prev) => ({ ...prev, ...out }));
      toast.success("Rewrite updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const impact = b.score_impact;
  const totalImpact = impact.jd_match + impact.ats_keyword + impact.recruiter_scan;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Before */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Before
        </div>
        <p className="mt-1 text-sm text-muted-foreground line-through decoration-rose-400/60">
          {b.original}
        </p>
      </div>

      {/* Issue */}
      <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-200/60 bg-rose-50 p-2.5 text-xs text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong className="mr-1">Issue:</strong>
          {b.issue}
        </span>
      </div>

      {/* Rewrite */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            FAANG-style rewrite
          </div>
          {b.has_placeholders && (
            <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-700 dark:text-amber-300">
              contains placeholders
            </Badge>
          )}
        </div>
        <p className="mt-1 rounded-md border border-emerald-500/20 bg-emerald-50 p-3 text-sm font-medium text-foreground dark:bg-emerald-500/10">
          <PlaceholderText text={b.rewrite} />
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Why this works:</strong> {b.reason}
        </p>
      </div>

      {/* Keywords + score impact */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Keywords added
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {b.keywords_added.length === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            {b.keywords_added.map((k) => (
              <Badge key={k} variant="secondary" className="text-[11px]">
                {k}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Estimated score impact
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1.5 text-[11px]">
            <ImpactPill label="JD Match" value={impact.jd_match} />
            <ImpactPill label="ATS" value={impact.ats_keyword} />
            <ImpactPill label="Recruiter" value={impact.recruiter_scan} />
          </div>
          {totalImpact === 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground">Marginal lift expected.</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={accepted ? "secondary" : "default"}
          className="gap-1"
          onClick={() => {
            navigator.clipboard.writeText(b.rewrite);
            setAccepted(true);
            toast.success("Copied — paste into your CV");
          }}
        >
          <Check className="h-3.5 w-3.5" />
          {accepted ? "Copied" : "Use this bullet"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={action.isPending}
          onClick={() => action.mutate("regenerate")}
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Regenerate
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={action.isPending}
          onClick={() => action.mutate("more-senior")}
        >
          <ArrowUpRight className="h-3.5 w-3.5" /> Make more senior
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={action.isPending}
          onClick={() => action.mutate("more-concise")}
        >
          <Scissors className="h-3.5 w-3.5" /> Make more concise
        </Button>
        {action.isPending && (
          <span className="self-center text-xs text-muted-foreground">Rewriting…</span>
        )}
      </div>
    </div>
  );
}

function ImpactPill({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 8
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : value >= 3
      ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
      : "bg-muted text-muted-foreground";
  return (
    <div className={`rounded-md px-2 py-1 text-center ${tone}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-sm font-bold">+{value}</div>
    </div>
  );
}

/** Highlights [bracketed placeholders] visually so users know to verify them. */
function PlaceholderText({ text }: { text: string }) {
  const parts = useMemo(() => text.split(/(\[[^\]]+\])/g), [text]);
  return (
    <>
      {parts.map((p, i) =>
        /^\[[^\]]+\]$/.test(p) ? (
          <span
            key={i}
            className="rounded bg-amber-500/20 px-1 font-semibold text-amber-900 dark:text-amber-200"
            title="Verify this value before sending"
          >
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function SaveAsVersion({ analysis }: { analysis: CvAnalysisRow }) {
  const qc = useQueryClient();
  const applyFn = useServerFn(applyRewritesAsNewVersion);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set((analysis.bullet_feedback ?? []).map((_, i) => i)),
  );
  const [appendSuggested, setAppendSuggested] = useState(true);

  const mut = useMutation({
    mutationFn: () =>
      applyFn({
        data: {
          analysisId: analysis.id,
          selectedIndexes: [...selected],
          appendSuggested,
        },
      }),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["cv-versions"] });
      toast.success(`Saved as v${v.version_number}`);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (
    (analysis.bullet_feedback ?? []).length === 0 &&
    (analysis.suggested_bullets ?? []).length === 0
  ) {
    return null;
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant="ghost" className="gap-1">
          <Link to="/cv-versions">
            <History className="h-3.5 w-3.5" /> History
          </Link>
        </Button>
        <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
          <Save className="h-3.5 w-3.5" /> Save as new version
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        Pick rewrites to apply
      </p>
      <div className="mt-2 max-h-56 space-y-2 overflow-auto">
        {(analysis.bullet_feedback ?? []).map((b, i) => (
          <label key={i} className="flex items-start gap-2 text-xs">
            <Checkbox
              checked={selected.has(i)}
              onCheckedChange={(c) => {
                const next = new Set(selected);
                if (c) next.add(i);
                else next.delete(i);
                setSelected(next);
              }}
            />
            <span className="text-foreground">{b.rewrite}</span>
          </label>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs">
        <Checkbox checked={appendSuggested} onCheckedChange={(c) => setAppendSuggested(!!c)} />
        Also append {(analysis.suggested_bullets ?? []).length} suggested new bullet(s)
      </label>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => mut.mutate()}
          disabled={mut.isPending || (selected.size === 0 && !appendSuggested)}
        >
          {mut.isPending ? "Saving…" : "Save version"}
        </Button>
      </div>
    </div>
  );
}
