'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Company, Job } from '@careersignal/shared';
import { formatDate } from '@/lib/utils';

interface Props {
  jobs: (Job & { company?: Company })[];
  companies: Company[];
}

export function AdminJobsClient({ jobs, companies }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function deleteJob(id: string) {
    if (!confirm('Delete this job?')) return;
    setDeleting(id);
    await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' });
    router.refresh();
    setDeleting(null);
  }

  async function toggleStatus(job: Job) {
    const newStatus = job.status === 'published' ? 'draft' : 'published';
    await fetch(`/api/admin/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Admin — Jobs</h1>
        <Link href="/admin/jobs/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          Post new job
        </Link>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{companies.length} companies • {jobs.length} jobs</p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="pb-3 pr-4">Title</th>
              <th className="pb-3 pr-4">Company</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Posted</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-border">
                <td className="py-3 pr-4 font-medium">{job.title}</td>
                <td className="py-3 pr-4">{job.company?.name}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${job.status === 'published' ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'}`}>
                    {job.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{formatDate(job.posted_at)}</td>
                <td className="py-3 flex gap-2">
                  <button onClick={() => toggleStatus(job)} className="text-xs text-primary hover:underline">
                    {job.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => deleteJob(job.id)}
                    disabled={deleting === job.id}
                    className="text-xs text-destructive hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
