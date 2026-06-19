'use client';

import { useRouter } from 'next/navigation';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { CAREER_OUTCOMES } from '@/lib/onboarding';

export function WelcomeClient() {
  const router = useRouter();

  async function select(outcome: string) {
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 1, career_outcome: outcome }),
    });
    router.push('/onboarding/cv');
  }

  return (
    <OnboardingLayout step={1} totalSteps={7} title="What career outcome are you working toward?">
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CAREER_OUTCOMES.map((outcome) => (
          <button
            key={outcome}
            type="button"
            onClick={() => select(outcome)}
            className="card-surface p-4 text-left text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary-muted"
          >
            {outcome}
          </button>
        ))}
      </div>
    </OnboardingLayout>
  );
}
