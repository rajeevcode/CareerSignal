import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { getCandidateByUserId } from '@/lib/queries';
import { CVScoreCard } from '@/components/CVScoreCard';
import { CVFeedbackPanel } from '@/components/CVFeedbackPanel';
import type { CvScoreBreakdown, CvFeedback } from '@careersignal/shared';
import { getAiServiceUrl } from '@/lib/utils';

export default async function ResumeScorePage() {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/resume-score');

  const profile = await getCandidateByUserId(session.userId);
  if (!profile?.cv_score) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-foreground">CV Score</h1>
        <p className="mt-4 text-muted-foreground">Upload your CV to get an instant score and detailed feedback.</p>
        <Link href="/cv" className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover">
          Upload CV
        </Link>
      </div>
    );
  }

  let breakdown = profile.cv_score_breakdown as CvScoreBreakdown | null;
  let feedback = profile.cv_feedback as CvFeedback | null;

  if (!breakdown) {
    try {
      const res = await fetch(`${getAiServiceUrl()}/score/cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: profile.id }),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        breakdown = data.breakdown;
        feedback = data.feedback;
      }
    } catch {
      // use fallback below
    }
  }

  const fallbackBreakdown: CvScoreBreakdown = breakdown || {
    ats_parseability: profile.cv_score,
    formatting: profile.cv_score * 0.9,
    keyword_strength: profile.cv_score * 0.85,
    impact_metrics: profile.cv_score * 0.8,
    role_clarity: profile.cv_score * 0.88,
    seniority_signal: profile.cv_score * 0.82,
    skill_relevance: profile.cv_score * 0.86,
    readability: profile.cv_score * 0.9,
  };

  const fallbackFeedback: CvFeedback = feedback || {
    good: ['Professional experience detected'],
    weak: ['Upload a refreshed CV for deeper analysis'],
    rewrite: ['Add quantified impact to your top bullets'],
    missing_keywords: profile.target_roles?.slice(0, 2) || [],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Your CV Score</h1>
      <p className="mt-2 text-muted-foreground">VMock-style feedback — know what to fix before you apply.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CVScoreCard overallScore={profile.cv_score} breakdown={fallbackBreakdown} />
        <CVFeedbackPanel feedback={fallbackFeedback} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/jd-match-tool" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          Match against a job description →
        </Link>
        <Link href="/cv" className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">
          Re-upload CV
        </Link>
      </div>
    </div>
  );
}
