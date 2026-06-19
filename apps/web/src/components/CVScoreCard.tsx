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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">CV Score</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-primary">{Math.round(overallScore)}</span>
        <span className="text-muted-foreground">/100</span>
      </div>
      <div className="mt-6 space-y-3">
        {(Object.entries(LABELS) as [keyof CvScoreBreakdown, string][]).map(([key, label]) => {
          const val = breakdown[key];
          return (
            <div key={key}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{Math.round(val)}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${val >= 75 ? 'bg-success' : val >= 50 ? 'bg-warning' : 'bg-muted-foreground'}`}
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
