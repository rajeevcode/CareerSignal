'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { ScoreBar } from '@/components/ui/ScoreRing';

interface Props {
  cvScore: number | null;
  bestRole: string;
  strengths: string[];
  gaps: string[];
}

export function ResultsClient({ cvScore, bestRole, strengths, gaps }: Props) {
  const router = useRouter();

  async function finish() {
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complete: true }),
    });
    router.push('/recommended');
  }

  return (
    <OnboardingLayout step={7} title="Your career signal is ready">
      <div className="mt-6 card-surface p-6">
        <p className="text-sm text-muted-foreground">Overall CV Score</p>
        <p className="text-4xl font-bold text-foreground">{cvScore ? Math.round(cvScore) : '—'}/100</p>
        <p className="mt-2 text-muted-foreground">Best role fit: <strong>{bestRole}</strong></p>
        {cvScore != null && <div className="mt-4"><ScoreBar score={cvScore} label="CV readiness" /></div>}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-surface p-4">
          <h3 className="font-semibold text-success">Top strengths</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {strengths.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <div className="card-surface p-4">
          <h3 className="font-semibold text-warning-foreground">Top gaps</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {gaps.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Recommended next action: review high-match jobs and improve your CV for your top target role.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={finish} className="btn-primary px-6 py-3">View recommended jobs</button>
        <Link href="/resume-score" className="rounded-xl border border-border px-6 py-3 text-sm font-medium">See full CV Score</Link>
      </div>
    </OnboardingLayout>
  );
}
