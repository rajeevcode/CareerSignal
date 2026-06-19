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
    <>
      <h1 className="text-2xl font-bold text-foreground">My CV</h1>
      <p className="mt-1 text-muted-foreground">Upload your resume to unlock AI matching and interview probability scores</p>

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
          {uploading ? 'Parsing your CV...' : 'Drag & drop your CV here'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX, max 10MB</p>
        <label className="mt-4 inline-block cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
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
          <h2 className="font-semibold text-foreground">Uploaded CVs</h2>
          <div className="mt-4 space-y-3">
            {existingCvs.map((cv) => (
              <div key={cv.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
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
    </>
  );
}
