import type { CvScoreBreakdown } from '@careersignal/shared';

const LABELS: Record<keyof CvScoreBreakdown, string> = {
  ats_parseability: 'ATS parseability',
  formatting: 'Formatting',
  keyword_strength: 'Keyword strength',
  impact_metrics: 'Impact metrics',
  role_clarity: 'Role clarity',
  seniority_signal: 'Seniority signal',
  skill_relevance: 'Skill relevance',
  readability: 'Readability',
};

interface Props {
  overallScore: number;
  breakdown: CvScoreBreakdown;
}

export function CVScoreCard({ overallScore, breakdown }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">CV Score</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-indigo-600">{Math.round(overallScore)}</span>
        <span className="text-slate-500">/100</span>
      </div>
      <div className="mt-6 space-y-3">
        {(Object.entries(LABELS) as [keyof CvScoreBreakdown, string][]).map(([key, label]) => {
          const val = breakdown[key];
          return (
            <div key={key}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium text-slate-800">{Math.round(val)}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${val >= 75 ? 'bg-emerald-500' : val >= 50 ? 'bg-amber-500' : 'bg-slate-400'}`}
                  style={{ width: `${Math.min(val, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
