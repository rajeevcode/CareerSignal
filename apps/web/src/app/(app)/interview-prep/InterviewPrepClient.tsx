'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';

export function InterviewPrepClient({ jobs }: { jobs: { id: string; title: string; company: string }[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    readiness_score?: number;
    questions?: string[];
    company_summary?: string;
    plan_30_90?: string;
  } | null>(null);
  const [jobId, setJobId] = useState(jobs[0]?.id || '');

  async function generate() {
    setLoading(true);
    const res = await fetch('/api/interview-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId || undefined }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <>
      <PageHeader title="Interview Prep" subtitle="Role-specific questions, company research, and STAR stories" />
      <div className="card-surface p-6">
        <label className="block text-sm font-medium text-foreground">
          Select a job to prep for
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2">
            <option value="">General prep</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
          </select>
        </label>
        <button type="button" onClick={generate} disabled={loading} className="btn-primary mt-4 px-6 py-2.5 text-sm disabled:opacity-50">
          Generate prep plan
        </button>
      </div>
      {loading && <LoadingState message="Building your interview prep..." className="mt-6" />}
      {result && !loading && (
        <div className="mt-6 space-y-4">
          {result.readiness_score != null && (
            <div className="card-surface p-4"><p className="text-sm text-muted-foreground">Prep readiness</p><p className="text-2xl font-bold">{Math.round(result.readiness_score)}%</p></div>
          )}
          {result.company_summary && <div className="card-surface p-4"><h3 className="font-semibold">Company summary</h3><p className="mt-2 text-sm text-muted-foreground">{result.company_summary}</p></div>}
          {result.questions && (
            <div className="card-surface p-4"><h3 className="font-semibold">Likely questions</h3><ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">{result.questions.map((q) => <li key={q}>{q}</li>)}</ul></div>
          )}
          {result.plan_30_90 && <div className="card-surface p-4"><h3 className="font-semibold">30-60-90 day plan</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{result.plan_30_90}</p></div>}
        </div>
      )}
      <Link href="/career-coach" className="mt-6 inline-block text-sm text-primary hover:underline">Ask Career Coach for mock interview →</Link>
    </>
  );
}
