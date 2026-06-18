import type { MatchScoreBreakdown, MatchExplanation } from '@careersignal/shared';
import { getProbabilityColor, getProbabilityLabel, getSignalBand } from '@careersignal/shared';
import { cn } from '@/lib/utils';

interface Props {
  score: number;
  jdMatchScore?: number;
  cvScore?: number;
  breakdown?: MatchScoreBreakdown;
  explanation?: MatchExplanation;
  compact?: boolean;
  sticky?: boolean;
}

const JD_LABELS: Record<string, string> = {
  skill_score: 'Required skills',
  experience_score: 'Experience match',
  role_similarity_score: 'Role similarity',
  domain_score: 'Domain match',
  seniority_score: 'Seniority match',
  location_score: 'Location & visa fit',
  cv_score: 'Keyword match',
  competition_score: 'Competition',
  freshness_score: 'Job freshness',
};

export function InterviewSignalCard({
  score,
  jdMatchScore,
  cvScore,
  breakdown,
  explanation,
  compact,
  sticky,
}: Props) {
  return (
    <div className={cn(
      'rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
      sticky && 'lg:sticky lg:top-24',
    )}>
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Your match</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">Interview Signal</h3>

      <div className="mt-4 flex items-center gap-4">
        <div
          className={cn(
            'flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4',
            score >= 70 ? 'border-emerald-500 bg-emerald-50' :
            score >= 55 ? 'border-amber-500 bg-amber-50' :
            'border-red-400 bg-red-50',
          )}
        >
          <span className={cn('text-2xl font-bold', getProbabilityColor(score))}>
            {Math.round(score)}%
          </span>
        </div>
        <div>
          <p className="text-sm text-slate-500">{getSignalBand(score)}</p>
          <p className={cn('text-lg font-semibold', getProbabilityColor(score))}>
            {getProbabilityLabel(score)} signal
          </p>
          <p className="mt-1 text-xs text-slate-400">Estimate only — not a guarantee</p>
        </div>
      </div>

      {(jdMatchScore != null || cvScore != null) && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          {jdMatchScore != null && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">JD Match</p>
              <p className="text-lg font-bold text-slate-900">{Math.round(jdMatchScore)}%</p>
            </div>
          )}
          {cvScore != null && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">CV Score</p>
              <p className="text-lg font-bold text-slate-900">{Math.round(cvScore)}%</p>
            </div>
          )}
        </div>
      )}

      {explanation?.summary && (
        <p className="mt-4 text-sm leading-relaxed text-slate-700">{explanation.summary}</p>
      )}

      {!compact && breakdown && (
        <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
          {Object.entries(JD_LABELS).map(([key, label]) => {
            const val = breakdown[key as keyof MatchScoreBreakdown] as number;
            if (typeof val !== 'number') return null;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs text-slate-600">{label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      val >= 75 ? 'bg-emerald-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-400',
                    )}
                    style={{ width: `${val}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-medium text-slate-700">{Math.round(val)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { InterviewSignalCard as InterviewProbabilityCard };
