'use client';

import { Loader2, Copy, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ToastProvider';

interface CoverLetter {
  id: string;
  content: string;
  tone: string | null;
  created_at: string;
}

const TONES = ['warm', 'concise', 'formal', 'enthusiastic'];

export function CoverLettersClient() {
  const { showToast } = useToast();
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jdText, setJdText] = useState('');
  const [tone, setTone] = useState('warm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cover-letter').then((r) => r.json()).then((d) => setLetters(d.letters || [])).catch(() => null);
  }, []);

  async function generate() {
    if (!jobTitle.trim() && !jdText.trim()) {
      setError('Enter a job title or paste a job description.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_title: jobTitle, company_name: companyName, jd_text: jdText, tone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Generation failed');
        return;
      }
      setLetters((prev) => [data.letter, ...prev]);
    } catch {
      setError('Could not generate cover letter.');
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    showToast({ title: 'Cover letter copied' });
  }

  return (
    <>
      <PageHeader title="Cover Letters" subtitle="AI-tailored cover letters per job" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h3 className="font-semibold text-foreground">Generate a cover letter</h3>
          <div className="mt-4 space-y-3">
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Job title (e.g. AI Product Manager)"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={6}
              placeholder="Paste the job description (optional, improves tailoring)"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <label htmlFor="tone" className="text-sm text-muted-foreground">Tone</label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm capitalize text-foreground"
              >
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Generate
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {letters.length === 0 && (
            <div className="card-surface p-6 text-sm text-muted-foreground">
              Your generated cover letters will appear here.
            </div>
          )}
          {letters.map((l) => (
            <div key={l.id} className="card-surface p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs capitalize text-accent-foreground">{l.tone}</span>
                <button
                  type="button"
                  onClick={() => copy(l.content)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground">{l.content}</pre>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
