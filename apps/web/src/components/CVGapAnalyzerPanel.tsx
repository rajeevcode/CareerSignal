'use client';

import type { CvGapAnalysis } from '@careersignal/shared';
import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface Props {
  candidateId: string;
  jobId: string;
  initialGap?: CvGapAnalysis;
  standalone?: boolean;
}

export function CVGapAnalyzerPanel({ candidateId, jobId, initialGap, standalone }: Props) {
  const [gap, setGap] = useState<CvGapAnalysis | null>(initialGap || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, job_id: jobId }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setGap(data);
    } catch {
      setError('Could not analyze CV fit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-900">Improve my CV for this job</h3>
        </div>
        {!gap && !standalone && (
          <button
            onClick={analyze}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze CV fit'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {gap && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-6 flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-700">{Math.round(gap.current_fit)}%</p>
              <p className="text-xs text-slate-500">Current JD Match</p>
            </div>
            <div className="text-2xl text-slate-300">→</div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{Math.round(gap.projected_fit)}%</p>
              <p className="text-xs text-slate-500">Potential after rewrite</p>
            </div>
            {gap.ats_match_score > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{Math.round(gap.ats_match_score)}%</p>
                <p className="text-xs text-slate-500">ATS keyword match</p>
              </div>
            )}
          </div>

          {gap.weak_bullets?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Weak bullets to rewrite</h4>
              <ul className="mt-1 space-y-1">
                {gap.weak_bullets.map((b) => (
                  <li key={b} className="text-sm text-slate-600">• {b}</li>
                ))}
              </ul>
            </div>
          )}

          {gap.skills_to_add?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Skills to add (if truthful)</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {gap.skills_to_add.map((s) => (
                  <span key={s} className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs text-indigo-800">{s}</span>
                ))}
              </div>
            </div>
          )}

          {gap.missing_keywords?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Missing keywords</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {gap.missing_keywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-800">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {gap.suggested_summary && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Suggested summary</h4>
              <p className="mt-1 rounded-lg bg-white p-3 text-sm text-slate-700">{gap.suggested_summary}</p>
            </div>
          )}

          {gap.suggested_bullets?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Suggested experience bullets</h4>
              <ul className="mt-1 space-y-1">
                {gap.suggested_bullets.map((b, i) => (
                  <li key={i} className="rounded-lg bg-white p-2 text-sm text-slate-700">• {b}</li>
                ))}
              </ul>
            </div>
          )}

          {gap.risk_notes?.length > 0 && (
            <p className="text-xs text-amber-700">{gap.risk_notes[0]}</p>
          )}

          {!standalone && (
          <button
            onClick={analyze}
            disabled={loading}
            className="text-sm text-indigo-600 hover:underline"
          >
            Re-analyze
          </button>
          )}
        </div>
      )}
    </div>
  );
}
