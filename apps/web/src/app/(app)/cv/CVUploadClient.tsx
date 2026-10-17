'use client';

import { Upload, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

interface Props {
  candidateId: string;
  existingCvs: { id: string; file_name: string; ats_score: number | null; uploaded_at: string; is_primary: boolean }[];
}

export function CVUploadClient({ candidateId, existingCvs }: Props) {
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

      trackEvent('cv_upload', { file_type: file.type });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [candidateId, router]);

  return (
    <div className="app-page">
      <div className="mb-6 border-b border-border pb-5">
        <p className="eyebrow">Source of truth</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">My CV</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Upload your resume to unlock AI matching and interview probability scores.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
          dragOver ? 'border-primary bg-accent' : 'border-border bg-card'
        }`}
      >
        {uploading ? (
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        ) : (
          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        )}
        <p className="mt-4 font-medium text-foreground">
          {uploading ? 'Parsing your CV...' : 'Drag & drop your CV here'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX, max 10MB</p>
        <label className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
          Browse files
          <input
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {existingCvs.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="eyebrow">Versions</p>
              <h2 className="mt-1 font-semibold text-foreground">Uploaded CVs</h2>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {existingCvs.map((cv) => (
              <div key={cv.id} className="panel-surface flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{cv.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(cv.uploaded_at).toLocaleDateString()}
                      {cv.ats_score != null && ` • ATS score: ${Math.round(cv.ats_score)}%`}
                      {cv.is_primary && ' • Primary'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
