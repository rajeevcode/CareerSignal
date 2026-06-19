'use client';

import { Trash2, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePaywall } from '@/components/ui/PaywallModal';
import { parsePaywallError } from '@/lib/billing';

interface Version {
  id: string;
  name: string;
  target_role: string | null;
  cv_score: number | null;
}

const DRAFT_KEY = 'cv-builder-draft';

export function CVBuilderClient() {
  const { open: openPaywall } = usePaywall();
  const [versions, setVersions] = useState<Version[]>([]);
  const [name, setName] = useState('AI Product Manager CV');
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    setExporting(true);
    try {
      const res = await fetch('/api/export-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.status === 402) {
        const pw = parsePaywallError(await res.json().catch(() => ({})));
        openPaywall({ reason: pw?.reason, feature: pw?.feature });
        return;
      }
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cv.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    fetch('/api/cv-builder').then((r) => r.json()).then((d) => setVersions(d.versions || [])).catch(() => null);
    // Hydrate from any draft handed off from the "Use this bullet" action.
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (typeof draft.summary === 'string' && draft.summary) setSummary(draft.summary);
        if (Array.isArray(draft.experience)) setExperience(draft.experience.filter(Boolean));
      }
    } catch {
      // ignore malformed draft
    }
  }, []);

  function persistDraft(next: { summary?: string; experience?: string[] }) {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const draft = raw ? JSON.parse(raw) : { summary: '', experience: [], skills: [] };
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, ...next }));
    } catch {
      // ignore
    }
  }

  function updateBullet(i: number, value: string) {
    setExperience((prev) => {
      const next = prev.map((b, idx) => (idx === i ? value : b));
      persistDraft({ experience: next });
      return next;
    });
  }

  function removeBullet(i: number) {
    setExperience((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      persistDraft({ experience: next });
      return next;
    });
  }

  async function save() {
    await fetch('/api/cv-builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        target_role: 'AI Product Manager',
        content_json: { summary, experience, skills: [] },
      }),
    });
    const res = await fetch('/api/cv-builder');
    setVersions((await res.json()).versions || []);
  }

  return (
    <>
      <PageHeader title="CV Builder" subtitle="Edit your CV with AI feedback on the side" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h3 className="font-semibold">CV preview</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-4 w-full rounded-lg border border-border px-3 py-2 font-semibold" />
          <label className="mt-4 block text-sm font-medium text-foreground">Professional summary</label>
          <textarea
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              persistDraft({ summary: e.target.value });
            }}
            rows={6}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Lead with target role and measurable impact..."
          />

          <label className="mt-4 block text-sm font-medium text-foreground">Experience bullets</label>
          {experience.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Add bullets from a job&apos;s &ldquo;Improve my CV for this job&rdquo; rewrites — they appear here.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {experience.map((bullet, i) => (
                <div key={i} className="flex items-start gap-2">
                  <textarea
                    value={bullet}
                    onChange={(e) => updateBullet(i, e.target.value)}
                    rows={2}
                    aria-label={`Experience bullet ${i + 1}`}
                    placeholder="Experience bullet"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeBullet(i)}
                    aria-label="Remove bullet"
                    className="mt-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={save} className="btn-primary px-6 py-2.5 text-sm">Save version</button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        </div>
        <div className="card-surface p-6">
          <h3 className="font-semibold">AI feedback</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Sharpen summary for AI Product Manager positioning</li>
            <li>• Add measurable impact metrics to top bullets</li>
            <li>• Include B2B SaaS keywords where truthful</li>
            <li>• Clarify visa and relocation in header</li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Editing bullets updates Impact Score estimate (+6 potential)</p>
        </div>
      </div>
      {versions.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold">Saved versions</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {versions.map((v) => (
              <div key={v.id} className="card-surface p-4">
                <p className="font-medium">{v.name}</p>
                <p className="text-xs text-muted-foreground">{v.target_role}</p>
                {v.cv_score != null && <p className="mt-1 text-sm text-primary">Score: {Math.round(v.cv_score)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
