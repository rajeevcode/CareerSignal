'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const REMOTE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const FUNCTION_OPTIONS = [
  '', 'Product', 'Engineering', 'Data', 'AI/ML', 'Sales', 'Marketing',
];

export function FilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/jobs?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <aside className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">Filters</h3>

      <div>
        <label className="text-xs font-medium text-slate-600">Search</label>
        <input
          type="text"
          defaultValue={searchParams.get('q') || ''}
          onChange={(e) => update('q', e.target.value)}
          placeholder="Role, skill, company..."
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Location</label>
        <input
          type="text"
          defaultValue={searchParams.get('location') || ''}
          onChange={(e) => update('location', e.target.value)}
          placeholder="City or country"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Remote policy</label>
        <select
          value={searchParams.get('remote_type') || ''}
          onChange={(e) => update('remote_type', e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {REMOTE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Function</label>
        <select
          value={searchParams.get('function_tag') || ''}
          onChange={(e) => update('function_tag', e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Any</option>
          {FUNCTION_OPTIONS.filter(Boolean).map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Min experience (years)</label>
        <input
          type="number"
          min={0}
          defaultValue={searchParams.get('experience_min') || ''}
          onChange={(e) => update('experience_min', e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={searchParams.get('visa_sponsorship') === 'true'}
          onChange={(e) => update('visa_sponsorship', e.target.checked ? 'true' : '')}
          className="rounded"
        />
        Visa sponsorship
      </label>
    </aside>
  );
}
