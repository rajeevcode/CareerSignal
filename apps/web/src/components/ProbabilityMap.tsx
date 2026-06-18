import type { ProbabilityMapEntry } from '@careersignal/shared';

interface Props {
  entries: ProbabilityMapEntry[];
  onboardingComplete?: boolean;
}

function barColor(score: number) {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-slate-400';
}

function textColor(score: number) {
  if (score >= 75) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-slate-600';
}

export function ProbabilityMap({ entries, onboardingComplete = true }: Props) {
  if (!onboardingComplete) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">Complete onboarding to see your interview probability map</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Your interview probability map</h2>
        <p className="mt-2 text-sm text-slate-500">Upload your CV and visit recommended jobs to generate match scores.</p>
      </div>
    );
  }

  const sourceLabel = entries[0]?.source === 'target_role' ? 'by target role' : 'by job function';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Your interview probability map</h2>
      <p className="mt-1 text-sm text-slate-500">Average match score {sourceLabel}</p>
      <div className="mt-5 space-y-4">
        {entries.map((entry) => (
          <div key={entry.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800">{entry.label}</span>
              <span className={`font-semibold ${textColor(entry.avg_score)}`}>{entry.avg_score}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barColor(entry.avg_score)}`}
                style={{ width: `${Math.min(entry.avg_score, 100)}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-slate-400">{entry.job_count} job{entry.job_count !== 1 ? 's' : ''} matched</p>
          </div>
        ))}
      </div>
    </div>
  );
}
