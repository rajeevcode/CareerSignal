import { Suspense } from 'react';
import { JobCard } from '@/components/JobCard';
import { FilterSidebar } from '@/components/FilterSidebar';
import { listPublishedJobs } from '@/lib/queries';

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
  const jobs = listPublishedJobs({
    q: params.q,
    location: params.location,
    remote_type: params.remote_type as 'remote' | 'hybrid' | 'onsite' | undefined,
    function_tag: params.function_tag,
    experience_min: params.experience_min ? parseInt(params.experience_min) : undefined,
    visa_sponsorship: params.visa_sponsorship === 'true',
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Find Jobs</h1>
      <p className="mt-1 text-slate-600">AI/Product/Tech roles ranked by your fit</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-4">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-slate-200" />}>
          <FilterSidebar />
        </Suspense>
        <div className="lg:col-span-3 space-y-4">
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <p className="text-slate-600">No jobs match your filters. Try adjusting your search.</p>
            </div>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </div>
    </div>
  );
}
