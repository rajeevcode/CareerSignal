'use client';

import { useState } from 'react';
import Link from 'next/link';
import { InterviewSignalCard } from '@/components/InterviewSignalCard';
import { ExplainabilityPanel } from '@/components/ExplainabilityPanel';
import { CVGapAnalyzerPanel } from '@/components/CVGapAnalyzerPanel';
import { usePaywall } from '@/components/ui/PaywallModal';
import { parsePaywallError } from '@/lib/billing';
import type { MatchExplanation, CvGapAnalysis } from '@careersignal/shared';

interface Props {
  candidateId: string;
  cvScore: number | null;
  isPro?: boolean;
  jdRemaining?: number | null;
}

export function JDMatchClient({ candidateId, cvScore, isPro = false, jdRemaining = null }: Props) {
  const { open: openPaywall } = usePaywall();
  const [jdText, setJdText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    jd_match_score: number;
    interview_signal: number;
    breakdown: Record<string, number>;
    explanation: MatchExplanation;
    gap: CvGapAnalysis;
  } | null>(null);

  async function handleMatch() {
    if (!jdText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/match-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, jd_text: jdText, job_title: jobTitle || undefined }),
      });
      if (res.status === 402) {
        const body = await res.json().catch(() => ({}));
        const pw = parsePaywallError(body);
        openPaywall({ reason: pw?.reason, feature: pw?.feature });
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Match failed');
      setResult(await res.json());
    } catch {
      setError('Could not analyze this JD. Is the AI service running?');
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">JD Match</h1>
      <p className="mt-2 text-muted-foreground">Paste any job description. CareerSignal compares your CV and shows your interview signal.</p>

      {!isPro && jdRemaining != null && (
        <p className="mt-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          You have {jdRemaining} of 3 free JD matches remaining this month
        </p>
      )}

      {!cvScore && (
        <div className="mt-6 rounded-lg border border-warning-soft bg-warning-soft p-4 text-sm text-warning-foreground">
          Upload your CV first for accurate matching. <Link href="/cv" className="font-medium underline">Upload CV</Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <input
          type="text"
          placeholder="Job title (optional)"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2"
        />
        <textarea
          rows={10}
          placeholder="Paste the full job description here..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm"
        />
        <button
          type="button"
          onClick={handleMatch}
          disabled={loading || !jdText.trim()}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Get JD Match Score'}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {result && (
        <div className="mt-10 space-y-6">
          <InterviewSignalCard
            score={result.interview_signal}
            jdMatchScore={result.jd_match_score}
            cvScore={cvScore ?? undefined}
            breakdown={result.breakdown as never}
            explanation={result.explanation}
          />
          <ExplainabilityPanel explanation={result.explanation} />
          <CVGapAnalyzerPanel
            candidateId={candidateId}
            jobId=""
            initialGap={result.gap}
            standalone
          />
        </div>
      )}
    </div>
  );
}
