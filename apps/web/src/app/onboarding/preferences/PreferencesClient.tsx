'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { OnboardingLayout } from '@/components/OnboardingLayout';

export function PreferencesClient() {
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const [visa, setVisa] = useState('');
  const [remote, setRemote] = useState('any');

  async function continueNext() {
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 5, notice_period: notice, visa_status: visa, remote_preference: remote }),
    });
    router.push('/onboarding/analyzing');
  }

  return (
    <OnboardingLayout step={5} title="Career preferences">
      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-foreground">Notice period</span>
          <input value={notice} onChange={(e) => setNotice(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2" placeholder="e.g. 30 days" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-foreground">Work authorization / visa</span>
          <input value={visa} onChange={(e) => setVisa(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2" placeholder="e.g. EU work permit, need sponsorship" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-foreground">Remote preference</span>
          <select value={remote} onChange={(e) => setRemote(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2">
            <option value="any">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={continueNext} className="btn-primary mt-8 px-6 py-3">Analyze my profile</button>
    </OnboardingLayout>
  );
}
