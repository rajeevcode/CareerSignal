'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { InterviewSignalCard } from '@/components/InterviewSignalCard';
import { ExplainabilityPanel } from '@/components/ExplainabilityPanel';
import { CVGapAnalyzerPanel } from '@/components/CVGapAnalyzerPanel';
import { usePaywall } from '@/components/ui/PaywallModal';
import { parsePaywallError } from '@/lib/billing';
import type { MatchExplanation, CvGapAnalysis } from '@careersignal/shared';

interface Props {
  candidateId: string;
  cvScore: number | null;
  hasCv?: boolean;
  isPro?: boolean;
  jdRemaining?: number | null;
}

export function JDMatchClient({ candidateId, cvScore, hasCv = cvScore != null, isPro = false, jdRemaining = null }: Props) {
  const { open: openPaywall } = usePaywall();
  const requestKey = useRef<string | null>(null);
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
    evidence?: {
      scoring_version: string;
      method: string;
      cv_text_available: boolean;
      unknown_context: string[];
      skills: { skill: string; jd_excerpt: string; cv_excerpt: string | null; status: 'mentioned' | 'not_found' | 'unknown' }[];
    };
  } | null>(null);

  async function handleMatch() {
    if (!jdText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/match-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey.current ?? (requestKey.current = crypto.randomUUID()) },
        body: JSON.stringify({ candidate_id: candidateId, jd_text: jdText, job_title: jobTitle || undefined }),
      });
      if (res.status === 402) {
        requestKey.current=null;
        const body = await res.json().catch(() => ({}));
        const pw = parsePaywallError(body);
        openPaywall({ reason: pw?.reason, feature: pw?.feature });
        setLoading(false);
        return;
      }
      if (res.status === 202) { setError('Analysis is still processing. Retry shortly to retrieve the same result.'); setLoading(false); return; }
      if (!res.ok) { requestKey.current=null; throw new Error('Match failed'); }
      setResult(await res.json());
      requestKey.current=null;
    } catch {
      setError('Could not analyze this JD. Is the AI service running?');
    }
    setLoading(false);
  }

  return (
    <div className="app-page">
      <div className="mb-6 border-b border-border pb-5">
        <p className="eyebrow">AI matching</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">JD Match</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Paste any job description. CareerSignal compares your CV and shows your interview signal.
        </p>
      </div>

      {!isPro && jdRemaining != null && (
        <p className="mb-4 inline-flex rounded-full border border-border bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          You have {jdRemaining} of 3 free JD matches remaining this month
        </p>
      )}

      {!hasCv && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning-soft p-4 text-sm text-warning-foreground">
          Upload your CV first for accurate matching. <Link href="/cv" className="font-medium underline">Upload CV</Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel-surface p-5">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">Analyze a role</h2>
              <p className="text-sm text-muted-foreground">Use the full JD for best skill and seniority matching.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">Job title</span>
              <input
                type="text"
                disabled={loading}
                placeholder="Optional, e.g. Senior Product Manager"
                value={jobTitle}
                onChange={(e) => { requestKey.current=null; setResult(null); setJobTitle(e.target.value); }}
                className="input-surface w-full px-3 py-2.5"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">Job description</span>
              <textarea
                disabled={loading}
                rows={13}
                maxLength={50_000}
                placeholder="Paste the full job description here..."
                value={jdText}
                onChange={(e) => { requestKey.current=null; setResult(null); setJdText(e.target.value); }}
                className="input-surface w-full px-3 py-3 font-mono text-sm leading-6"
              />
            </label>
            <button
              type="button"
              onClick={handleMatch}
              disabled={loading || !jdText.trim()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Analyzing...' : 'Get JD Match Score'}
            </button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <aside className="panel-surface p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">What you get</h2>
              <p className="text-sm text-muted-foreground">Decision-grade signal, not a generic summary.</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {['JD match score across skill, seniority, domain, and location', 'Interview signal with explainable strengths and gaps', 'CV gap analysis with rewrite-ready next actions'].map((item) => (
              <li key={item} className="rounded-md border border-border bg-card p-3 leading-6">{item}</li>
            ))}
          </ul>
        </aside>
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
          {result.evidence && <section className="panel-surface p-5" aria-labelledby="source-evidence-title">
            <h2 id="source-evidence-title" className="text-lg font-semibold">Source evidence</h2>
            <p className="mt-2 text-sm text-muted-foreground">{result.evidence.method}</p>
            <p className="mt-1 text-xs text-muted-foreground">Scoring version: {result.evidence.scoring_version}</p>
            {!result.evidence.cv_text_available && <p className="mt-3 text-sm">No CV source text is available. Skill coverage is unknown.</p>}
            {result.evidence.skills.length === 0 && <p className="mt-3 text-sm">No source-backed skill excerpts were identified.</p>}
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {result.evidence.skills.map((item) => <li key={item.skill} className="rounded-md border border-border p-3">
                <h3 className="font-semibold">{item.skill}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{item.status === 'mentioned' ? 'Mentioned in CV' : item.status === 'unknown' ? 'CV evidence unavailable' : 'Phrase not found in CV'}</p>
                <p className="mt-3 text-xs font-semibold">Job description excerpt</p><blockquote className="mt-1 text-sm">{item.jd_excerpt}</blockquote>
                {item.cv_excerpt && <><p className="mt-3 text-xs font-semibold">CV excerpt</p><blockquote className="mt-1 text-sm">{item.cv_excerpt}</blockquote></>}
              </li>)}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Unknown: {result.evidence.unknown_context.join(', ')}. A phrase missing from your CV does not establish that you lack the skill.</p>
          </section>}
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
