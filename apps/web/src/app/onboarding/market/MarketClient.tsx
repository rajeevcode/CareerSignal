'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { TARGET_MARKETS } from '@/lib/onboarding';

export function MarketClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  async function continueNext() {
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 4, target_markets: selected }),
    });
    router.push('/onboarding/preferences');
  }

  return (
    <OnboardingLayout step={4} title="Where do you want to work?">
      <p className="mt-2 text-muted-foreground">Select target markets for your job search.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {TARGET_MARKETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSelected((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              selected.includes(m) ? 'border-primary bg-primary-muted text-primary' : 'border-border text-foreground'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <button type="button" onClick={continueNext} disabled={selected.length === 0} className="btn-primary mt-8 px-6 py-3 disabled:opacity-50">
        Continue
      </button>
    </OnboardingLayout>
  );
}
