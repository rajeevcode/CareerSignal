'use client';

import Link from 'next/link';
import { Loader2, Mic } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaywall } from '@/components/ui/PaywallModal';
import { parsePaywallError } from '@/lib/billing';

interface SessionRow {
  id: string;
  role_title: string;
  mode: string;
  overall_score: number | null;
  created_at: string;
}

export function MockInterviewPanel({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const { open: openPaywall } = usePaywall();
  const [roleTitle, setRoleTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mode, setMode] = useState('behavioral');
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!roleTitle.trim()) {
      setError('Enter the role you want to practice for.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_title: roleTitle, company_name: companyName, mode, difficulty }),
      });
      if (res.status === 402) {
        const pw = parsePaywallError(await res.json().catch(() => ({})));
        openPaywall({ reason: pw?.reason, feature: pw?.feature });
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not start interview');
        return;
      }
      router.push(`/interview-prep/${data.session_id}`);
    } catch {
      setError('Could not start the mock interview.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 card-surface p-6">
      <div className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Mock Interview Studio</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Practice a 5-question mock interview with live STAR scoring and a final readiness summary.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          placeholder="Role (e.g. AI Product Manager)"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company (optional)"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm capitalize">
          <option value="behavioral">Behavioral</option>
          <option value="technical">Technical</option>
          <option value="company">Company fit</option>
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm capitalize">
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
        Start mock interview
      </button>

      {sessions.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-foreground">Past sessions</h4>
          <div className="mt-3 space-y-2">
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/interview-prep/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm hover:bg-muted"
              >
                <span className="text-foreground">
                  {s.role_title} <span className="text-muted-foreground capitalize">· {s.mode}</span>
                </span>
                <span className="font-medium text-primary">
                  {s.overall_score != null ? `${s.overall_score}/100` : 'In progress'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
