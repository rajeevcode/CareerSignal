import { listCompanies } from '@/lib/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Companies</h1>
      <p className="mt-2 text-muted-foreground">Verified companies hiring on CareerSignal</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{c.name}</h2>
              {c.verified && (
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">Verified</span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{c.location} · {c.industry}</p>
            <Link href={`/jobs?q=${encodeURIComponent(c.name)}`} className="mt-3 inline-block text-sm text-primary hover:underline">
              View jobs →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
