'use client';

import Link from 'next/link';
import { Bookmark, CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { useState } from 'react';
import type { Job, MatchScore } from '@careersignal/shared';
import { InterviewProbabilityCard } from '@/components/InterviewProbabilityCard';
import { ExplainabilityPanel } from '@/components/ExplainabilityPanel';
import { CVGapAnalyzerPanel } from '@/components/CVGapAnalyzerPanel';
import { useToast } from '@/components/ToastProvider';
import { useAuthGate } from '@/components/auth/AuthGate';
import { formatSalary, formatDate } from '@/lib/utils';

interface Props {
  job: Job;
  matchScore: MatchScore | null;
  candidateId: string | null;
  isSaved: boolean;
  hasApplied: boolean;
}

export function JobDetailClient({ job, matchScore, candidateId, isSaved, hasApplied }: Props) {
  const { showToast } = useToast();
  const authGate = useAuthGate();
  const [saved, setSaved] = useState(isSaved);
  const [applied, setApplied] = useState(hasApplied);
  const [loading, setLoading] = useState(false);
  const [applyNotice, setApplyNotice] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ jdMatch: number; ats: number; interviewSignal: number } | null>(null);

  async function toggleSave() {
    if (!candidateId) { authGate.open({ reason: 'Create a free account to save jobs to your tracker.', redirect: `/jobs/${job.id}` }); return; }
    setLoading(true);
    await fetch('/api/save-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id, unsave: saved }),
    });
    setSaved(!saved);
    setLoading(false);
  }

  async function apply() {
    if (!candidateId) { authGate.open({ reason: 'Create a free account to apply and track this application.', redirect: `/jobs/${job.id}` }); return; }
    setLoading(true);
    setApplyNotice(null);
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setApplied(true);
      const title = data.job_title || job.title;
      const company = data.company_name || job.company?.name || 'the company';
      const emailNote = data.email_sent
        ? 'A confirmation email is on its way.'
        : 'Track this application anytime from Applied Jobs.';
      setApplyNotice(`Added to Applied Jobs. ${emailNote}`);
      showToast({
        title: 'Added to Applied Jobs',
        description: `${title} at ${company}. ${emailNote}`,
        action: { label: 'View Applied Jobs', href: '/applied' },
      });
    } else {
      showToast({
        title: 'Application failed',
        description: data.error || 'Please try again.',
        durationMs: 5000,
      });
    }
    setLoading(false);
  }

  const company = job.company;
  const explanation = matchScore?.explanation_json;

  const baseSignal = matchScore ? (matchScore.interview_signal ?? matchScore.final_score) : 0;
  const liveSignal = estimate ? Math.max(baseSignal, estimate.interviewSignal) : baseSignal;
  const liveJdMatch = estimate ? Math.max(matchScore?.jd_match_score ?? 0, estimate.jdMatch) : matchScore?.jd_match_score;
  const signalDelta = estimate ? Math.round(liveSignal - baseSignal) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{company?.name}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
              {job.location && <span>{job.location}</span>}
              <span>•</span>
              <span className="capitalize">{job.remote_type}</span>
              <span>•</span>
              <span>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
              <span>•</span>
              <span>Posted {formatDate(job.posted_at)}</span>
              {job.visa_sponsorship && (
                <>
                  <span>•</span>
                  <span className="text-success">Visa sponsorship</span>
                </>
              )}
            </div>
          </div>

          {applyNotice && (
            <div className="rounded-xl border border-border bg-success-soft p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <div>
                    <p className="font-medium text-success">Application recorded</p>
                    <p className="mt-1 text-sm text-success">{applyNotice}</p>
                  </div>
                </div>
                <Link
                  href="/applied"
                  className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  View Applied Jobs
                </Link>
              </div>
            </div>
          )}

          <div className="lg:hidden">
            {matchScore ? (
              <InterviewProbabilityCard
                score={liveSignal}
                jdMatchScore={liveJdMatch}
                cvScore={matchScore.cv_score}
                breakdown={matchScore}
                explanation={explanation}
                compact
              />
            ) : !candidateId ? (
              <div className="rounded-xl border border-border bg-accent p-6 text-center">
                <p className="font-medium text-accent-foreground">Sign in to see your Interview Signal</p>
                <a href="/login" className="mt-3 inline-block text-sm text-primary hover:underline">Log in →</a>
              </div>
            ) : null}
          </div>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-semibold">About the role</h2>
            <div className="mt-2 whitespace-pre-wrap text-foreground">{job.description}</div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Required skills</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {job.required_skills.map((s) => (
                <span key={s} className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">{s}</span>
              ))}
            </div>
          </div>

          {explanation && (
            <ExplainabilityPanel explanation={explanation} />
          )}

          {candidateId && (
            <div id="cv-gap">
            <CVGapAnalyzerPanel
              candidateId={candidateId}
              jobId={job.id}
              jobTitle={job.title}
              companyName={company?.name}
              requiredSkills={job.required_skills}
              cvScore={matchScore?.cv_score}
              initialGap={matchScore?.explanation_json?.cv_gap}
              onEstimate={setEstimate}
            />
            </div>
          )}
        </div>

        <div className="hidden space-y-4 lg:block">
          {matchScore ? (
            <>
              <InterviewProbabilityCard
                score={liveSignal}
                jdMatchScore={liveJdMatch}
                cvScore={matchScore.cv_score}
                breakdown={matchScore}
                explanation={explanation}
                sticky
              />
              {signalDelta > 0 && (
                <p className="rounded-lg bg-success-soft px-3 py-2 text-center text-xs font-medium text-success">
                  +{signalDelta} after CV optimization (estimated)
                </p>
              )}
              <div className="space-y-2">
                <button
                  onClick={apply}
                  disabled={loading || applied}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {applied ? 'Applied' : 'Apply Now'}
                </button>
                <a
                  href="#cv-gap"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-accent py-3 text-sm font-medium text-accent-foreground hover:bg-accent/80"
                >
                  Improve CV for this Job
                </a>
                <button
                  onClick={toggleSave}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium hover:bg-muted"
                >
                  <Bookmark className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`} />
                  {saved ? 'Saved' : 'Save Job'}
                </button>
                <Link
                  href="/career-coach"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask AI About This Job
                </Link>
              </div>
            </>
          ) : candidateId ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Computing your match score...
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-accent p-6 text-center">
              <p className="font-medium text-accent-foreground">Sign in to see your interview probability</p>
              <a href="/login" className="mt-3 inline-block text-sm text-primary hover:underline">Log in →</a>
            </div>
          )}
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="fixed bottom-0 left-0 right-0 flex gap-2 border-t border-border bg-card p-4 lg:hidden">
        <button
          onClick={apply}
          disabled={loading || applied}
          className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {applied ? 'Applied' : 'Apply'}
        </button>
        <button onClick={toggleSave} disabled={loading} className="rounded-lg border px-4 py-2.5 text-sm">
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}
