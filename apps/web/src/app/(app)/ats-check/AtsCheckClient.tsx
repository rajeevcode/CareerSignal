'use client';

import { CheckCircle2, AlertTriangle, XCircle, Loader2, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { LockedFeature } from '@/components/ui/LockedFeature';
import { EmptyState } from '@/components/ui/EmptyState';

interface AtsCheck {
  id: string;
  category: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  fix: string;
}
interface AtsReport {
  score: number;
  summary: string;
  stats: { wordCount: number; bulletCount: number; sectionsFound: string[]; sectionsMissing: string[]; actionVerbsRatio: number; quantifiedBullets: number };
  checks: AtsCheck[];
  keyword_suggestions: string[];
  top_fixes: string[];
}

const STATUS_ICON = {
  pass: <CheckCircle2 className="h-4 w-4 text-success" />,
  warn: <AlertTriangle className="h-4 w-4 text-warning-foreground" />,
  fail: <XCircle className="h-4 w-4 text-risk" />,
};

export function AtsCheckClient({ isPro }: { isPro: boolean }) {
  const [report, setReport] = useState<AtsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ats-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ATS check failed');
        return;
      }
      setReport(data);
    } catch {
      setError('Could not run ATS check.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="ATS Check"
        subtitle="See how an Applicant Tracking System reads your CV"
        actions={
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            {report ? 'Re-scan CV' : 'Scan my CV'}
          </button>
        }
      />

      {error && (
        <EmptyState
          title="Couldn't scan your CV"
          description={error}
          icon={ScanLine}
          action={{ label: 'Upload a CV', href: '/cv' }}
        />
      )}

      {report && (
        <div className="space-y-6">
          {/* Score + summary (free) */}
          <div className="card-surface flex flex-wrap items-center gap-6 p-6">
            <ScoreRing score={report.score} label="ATS score" size="lg" />
            <div className="flex-1 min-w-[12rem]">
              <p className="text-foreground">{report.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5">{report.stats.wordCount} words</span>
                <span className="rounded-full bg-muted px-2 py-0.5">{report.stats.bulletCount} bullets</span>
                <span className="rounded-full bg-muted px-2 py-0.5">{report.stats.quantifiedBullets} quantified</span>
                <span className="rounded-full bg-muted px-2 py-0.5">{Math.round(report.stats.actionVerbsRatio * 100)}% action verbs</span>
              </div>
            </div>
          </div>

          {/* Top fixes (free) */}
          {report.top_fixes.length > 0 && (
            <div className="card-surface p-6">
              <h3 className="font-semibold text-foreground">Top fixes</h3>
              <ul className="mt-3 space-y-2">
                {report.top_fixes.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full checklist (Pro) */}
          {isPro ? (
            <div className="card-surface p-6">
              <h3 className="font-semibold text-foreground">Full ATS checklist</h3>
              <div className="mt-4 space-y-3">
                {report.checks.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                    <span className="mt-0.5">{STATUS_ICON[c.status]}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.detail}</p>
                      {c.fix && <p className="mt-1 text-xs text-primary">Fix: {c.fix}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {report.keyword_suggestions.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-sm font-semibold text-foreground">Missing keywords</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {report.keyword_suggestions.map((k) => (
                      <span key={k} className="rounded-full bg-risk-soft px-2.5 py-0.5 text-xs text-risk">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <LockedFeature
              level="pro-feature"
              title="Full ATS checklist & keyword analysis"
              description="Unlock the detailed line-by-line ATS audit (structure, formatting, contact, content) and the missing-keyword analysis tuned to your target role."
              preview={
                <div className="space-y-3 p-6">
                  {report.checks.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      {STATUS_ICON[c.status]}
                      <div className="h-3 w-2/3 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              }
            />
          )}
        </div>
      )}

      {!report && !error && !loading && (
        <EmptyState
          title="Check your CV against ATS parsers"
          description="Scan your primary CV to see your ATS score, structure issues, and the top fixes recruiters' systems care about."
          icon={ScanLine}
          action={{ label: 'Scan my CV', onClick: run }}
        />
      )}
    </>
  );
}
