import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Plane, Check, X, BookmarkPlus, BookmarkCheck } from "lucide-react";
import type { DashboardJob } from "@/lib/dashboard.functions";

function matchTone(match: number) {
  if (match >= 80) return { label: "Strong match", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300" };
  if (match >= 60) return { label: "Moderate match", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300" };
  return { label: "Stretch match", cls: "bg-muted text-muted-foreground border-border" };
}

export function JobMatchCard({
  job,
  onSave,
  saved,
  saving,
}: {
  job: DashboardJob;
  onSave?: (job: DashboardJob) => void;
  saved?: boolean;
  saving?: boolean;
}) {
  const tone = matchTone(job.match);
  const salary =
    job.salary_min && job.salary_max
      ? `${job.salary_currency ?? ""} ${(job.salary_min / 1000).toFixed(0)}k–${(job.salary_max / 1000).toFixed(0)}k`
      : null;

  return (
    <Card className="flex flex-col gap-3 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{job.title}</h3>
          <p className="truncate text-sm text-muted-foreground">{job.company}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-2xl font-bold tracking-tight text-primary">{job.match}%</div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.cls}`}>
            {tone.label}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {job.location && (
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
        )}
        {job.remote_policy && (
          <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.remote_policy}</span>
        )}
        {job.visa_sponsorship && (
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><Plane className="h-3 w-3" /> Visa sponsor</span>
        )}
        {salary && <span>{salary}</span>}
      </div>

      {(job.matched_skills.length > 0 || job.missing_skills.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {job.matched_skills.slice(0, 4).map((s) => (
            <Badge key={`m-${s}`} variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300">
              <Check className="h-3 w-3" /> {s}
            </Badge>
          ))}
          {job.missing_skills.slice(0, 3).map((s) => (
            <Badge key={`x-${s}`} variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300">
              <X className="h-3 w-3" /> {s}
            </Badge>
          ))}
        </div>
      )}

      {onSave && (
        <div className="mt-1 flex justify-end">
          <Button
            size="sm"
            variant={saved ? "secondary" : "outline"}
            disabled={saved || saving}
            onClick={() => onSave(job)}
            className="gap-1.5"
          >
            {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
            {saved ? "Saved" : saving ? "Saving…" : "Save to pipeline"}
          </Button>
        </div>
      )}
    </Card>
  );
}

