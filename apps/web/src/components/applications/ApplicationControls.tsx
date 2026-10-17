'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Application, ApplicationStatus } from '@careersignal/shared';
import { APPLICATION_STAGES, type ApplicationAction } from '@/lib/career-actions';

export function ApplicationControls({ application, compact = false }: { application: Application; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(application.next_action ?? '');
  async function update(action: ApplicationAction) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...action, expected_updated_at: application.updated_at }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(response.status === 409
        ? 'This application changed. Refresh before trying again.' : 'Unable to save. Please try again.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save. Please try again.');
    } finally { setBusy(false); }
  }
  return (
    <div className="mt-3 space-y-3" aria-busy={busy}>
      {!compact && <>
        <label className="block text-xs font-medium">
          Application stage
          <select value={application.status} disabled={busy}
            onChange={(event) => void update({ action: 'status', status: event.target.value as ApplicationStatus })}
            className="mt-1 block w-full rounded-md border border-border bg-background p-2 text-sm text-foreground">
            {Object.entries(APPLICATION_STAGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <form onSubmit={(event) => { event.preventDefault(); void update({ action: 'note', note }); }}>
          <label className="block text-xs font-medium">Next action or private note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2}
              disabled={busy} className="mt-1 block w-full rounded-md border border-border bg-background p-2 text-sm text-foreground" />
          </label>
          <button type="submit" disabled={busy || note === (application.next_action ?? '')} className="mt-1 text-sm font-medium text-primary disabled:opacity-50">Save note</button>
        </form>
      </>}
      {application.follow_up_due_at && <div className="flex flex-wrap gap-3 text-sm">
        <button type="button" disabled={busy} onClick={() => void update({ action: 'snooze' })} className="font-medium text-primary disabled:opacity-50">Snooze 7 days</button>
        <button type="button" disabled={busy} onClick={() => void update({ action: 'complete' })} className="font-medium text-primary disabled:opacity-50">Mark follow-up done</button>
      </div>}
      <span role="status" className="text-xs text-muted-foreground">{busy ? 'Saving…' : ''}</span>
      {error && <p role="alert" className="text-sm text-risk">{error}</p>}
    </div>
  );
}
