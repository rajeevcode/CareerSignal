import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default async function RestrictedPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;
  const isRecruiter = area === 'recruiter';

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-risk-soft text-risk">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
        {isRecruiter ? 'Recruiter access required' : 'Admin access required'}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {isRecruiter
          ? 'The recruiter dashboard is available after company verification.'
          : 'You don’t have permission to view this area.'}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary px-6 py-2.5">Go back to home</Link>
        {isRecruiter && (
          <Link href="/for-employers" className="rounded-lg border border-border bg-card px-6 py-2.5 font-semibold text-foreground hover:bg-muted">
            View recruiter plans
          </Link>
        )}
      </div>
    </div>
  );
}
