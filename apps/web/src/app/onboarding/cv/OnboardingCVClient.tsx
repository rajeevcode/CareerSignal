'use client';

import { Upload, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { trackEvent } from '@/lib/analytics';

interface Props {
  candidateId: string;
}

export function OnboardingCVClient({ candidateId }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(pdf|docx)$/i)) {
      setError('Please upload a PDF or DOCX file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('candidate_id', candidateId);

      const res = await fetch('/api/parse-cv', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      trackEvent('cv_upload', { file_type: file.type, context: 'onboarding' });
      router.push('/onboarding/roles');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [candidateId, router]);

  return (
    <OnboardingLayout step={1} title="Upload your CV">
      <p className="mt-2 text-muted-foreground">
        We&apos;ll build your AI profile and rank jobs by your interview probability.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`mt-8 rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragOver ? 'border-primary bg-accent' : 'border-border bg-card'
        }`}
      >
        {uploading ? (
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        ) : (
          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        )}
        <p className="mt-4 font-medium text-foreground">
          {uploading ? 'Analyzing your CV...' : 'Drag and drop your CV here'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX · Max 10MB</p>
        {!uploading && (
          <label className="mt-4 inline-block cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            Browse files
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-risk-soft p-3 text-sm text-risk">{error}</p>}

      <div className="mt-8 flex items-start gap-3 rounded-lg border border-border bg-card p-4">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">What happens next</p>
          <p className="mt-1">AI extracts your skills, experience, and seniority — then ranks jobs by how likely you are to get an interview.</p>
        </div>
      </div>
    </OnboardingLayout>
  );
}
