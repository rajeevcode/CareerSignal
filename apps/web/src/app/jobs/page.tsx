import { Suspense } from 'react';
import { JobCard } from '@/components/JobCard';
import { FilterSidebar } from '@/components/FilterSidebar';
import { GuestJobsGate } from '@/components/jobs/GuestJobsGate';
import { listPublishedJobs } from '@/lib/queries';
import { getSession } from '@/lib/auth/session';

const GUEST_PREVIEW_COUNT = 2;

interface SearchParams {
  q?: string;
  location?: string;
  remote_type?: string;
  function_tag?: string;
  experience_min?: string;
  visa_sponsorship?: string;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [session, jobs] = await Promise.all([
    getSession(),
    listPublishedJobs({
      q: params.q,
      location: params.location,
      remote_type: params.remote_type as 'remote' | 'hybrid' | 'onsite' | undefined,
      function_tag: params.function_tag,
      experience_min: params.experience_min ? parseInt(params.experience_min) : undefined,
      visa_sponsorship: params.visa_sponsorship === 'true',
    }),
  ]);

  const isGuest = !session;
  // Guests see only the top 2 previews, then a signup gate. Authenticated users see the full list.
  const visibleJobs = isGuest ? jobs.slice(0, GUEST_PREVIEW_COUNT) : jobs;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Find Jobs</h1>
      <p className="mt-1 text-muted-foreground">AI/Product/Tech roles ranked by your fit</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-4">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
          <FilterSidebar />
        </Suspense>
        <div className="lg:col-span-3 space-y-4">
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">No jobs match your filters. Try adjusting your search.</p>
            </div>
          ) : (
            <>
              {visibleJobs.map((job) => (
                <JobCard key={job.id} job={job} guestPreview={isGuest} />
              ))}
              {isGuest && <GuestJobsGate />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
