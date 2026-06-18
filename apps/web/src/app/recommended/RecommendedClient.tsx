'use client';

import { DashboardNav } from '@/components/DashboardNav';
import { JobCard } from '@/components/JobCard';
import { useState } from 'react';
import type { Job } from '@careersignal/shared';

type Tab = 'best_match' | 'stretch' | 'visa_friendly';

interface MatchRow {
  final_score: number;
  explanation_json?: { category?: string };
  job: Job;
}

interface Props {
  bestMatch: MatchRow[];
  stretch: MatchRow[];
  visaFriendly: MatchRow[];
}

export function RecommendedClient({ bestMatch, stretch, visaFriendly }: Props) {
  const [tab, setTab] = useState<Tab>('best_match');

  const tabs: { id: Tab; label: string; data: MatchRow[] }[] = [
    { id: 'best_match', label: 'Best Match', data: bestMatch },
    { id: 'stretch', label: 'Stretch Roles', data: stretch },
    { id: 'visa_friendly', label: 'Visa-Friendly', data: visaFriendly },
  ];

  const active = tabs.find((t) => t.id === tab)!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <DashboardNav />
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Recommended Jobs</h1>
      <p className="mt-1 text-slate-600">Jobs ranked by your estimated interview probability</p>

      <div className="mt-6 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-indigo-100 text-indigo-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label} ({t.data.length})
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {active.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-slate-600">No jobs in this category yet. Upload your CV to get recommendations.</p>
          </div>
        ) : (
          active.data.map((m) => (
            <JobCard key={m.job.id} job={{ ...m.job, match_score: m.final_score }} showMatch />
          ))
        )}
      </div>
    </div>
  );
}
