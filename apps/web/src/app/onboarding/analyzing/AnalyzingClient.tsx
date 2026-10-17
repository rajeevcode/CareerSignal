'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { LoadingState } from '@/components/ui/LoadingState';

const MESSAGES = [
  'Reading your CV structure',
  'Extracting skills and achievements',
  'Checking ATS readability',
  'Mapping your profile to target roles',
  'Finding your strongest job signals',
];

export function AnalyzingClient() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => Math.min(i + 1, MESSAGES.length - 1)), 1200);
    const done = setTimeout(async () => {
      await fetch('/api/score-cv', { method: 'POST' }).catch(() => null);
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 6 }),
      });
      router.push('/onboarding/results');
    }, 6000);
    return () => { clearInterval(t); clearTimeout(done); };
  }, [router]);

  return (
    <OnboardingLayout step={6} title="Analyzing your career signal">
      <LoadingState message={MESSAGES[idx]} steps={MESSAGES.slice(0, idx + 1)} className="mt-8" />
    </OnboardingLayout>
  );
}
