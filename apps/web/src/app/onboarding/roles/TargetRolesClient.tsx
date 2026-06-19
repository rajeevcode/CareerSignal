'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { OnboardingLayout } from '@/components/OnboardingLayout';

const PRESET_ROLES = [
  'AI Product Manager',
  'Technical Product Manager',
  'Data Product Manager',
  'Growth Product Manager',
  'Program Manager',
  'Product Owner',
  'Senior Product Manager',
  'AI Transformation Lead',
];

interface Props {
  currentTitle: string | null;
  experienceTitles: string[];
  skills: string[];
  existingRoles: string[];
}

export function TargetRolesClient({ currentTitle, experienceTitles, skills, existingRoles }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(existingRoles);
  const [customRole, setCustomRole] = useState('');
  const [loading, setLoading] = useState(false);

  const suggested = useMemo(() => {
    const set = new Set<string>();
    if (currentTitle) set.add(currentTitle);
    experienceTitles.slice(0, 3).forEach((t) => set.add(t));
    PRESET_ROLES.forEach((r) => {
      if (skills.some((s) => s.toLowerCase().includes('ai') || s.toLowerCase().includes('product'))) {
        if (r.includes('Product') || r.includes('AI')) set.add(r);
      }
    });
    PRESET_ROLES.forEach((r) => set.add(r));
    return Array.from(set).slice(0, 10);
  }, [currentTitle, experienceTitles, skills]);

  function toggleRole(role: string) {
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function addCustomRole() {
    const trimmed = customRole.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
      setCustomRole('');
    }
  }

  async function handleFinish() {
    if (selected.length === 0) return;
    setLoading(true);

    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_roles: selected }),
    });

    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 3, target_roles: selected }),
    });

    router.push('/onboarding/market');
    router.refresh();
    setLoading(false);
  }

  return (
    <OnboardingLayout step={3} title="What roles are you targeting?">
      <p className="mt-2 text-muted-foreground">
        Select one or more roles. We&apos;ll rank jobs and build your interview probability map around these.
      </p>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-foreground">Suggested for you</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggested.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => toggleRole(role)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selected.includes(role)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground hover:border-primary'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <input
          type="text"
          placeholder="Add custom role..."
          value={customRole}
          onChange={(e) => setCustomRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRole())}
          className="flex-1 rounded-lg border border-border px-3 py-2"
        />
        <button
          type="button"
          onClick={addCustomRole}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Add
        </button>
      </div>

      {selected.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{selected.length} role{selected.length > 1 ? 's' : ''} selected</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.map((role) => (
              <span key={role} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
                {role}
                <button type="button" onClick={() => toggleRole(role)} className="text-primary hover:text-primary-hover">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleFinish}
        disabled={loading || selected.length === 0}
        className="mt-8 w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? 'Finding your best jobs...' : 'Find my best jobs →'}
      </button>
    </OnboardingLayout>
  );
}
