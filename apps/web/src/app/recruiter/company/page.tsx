import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getRecruiterProfile } from '@/lib/queries';

export default async function RecruiterCompanyPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'recruiter') redirect('/dashboard');

  const profile = await getRecruiterProfile(session.userId);
  const company = profile?.company;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Company profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your employer brand on CareerSignal</p>

      <div className="mt-8 card-surface p-6">
        {company ? (
          <div className="flex gap-4">
            <div className="rounded-lg bg-primary-muted p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{company.name}</h2>
              {company.industry && <p className="text-sm text-muted-foreground">{company.industry}</p>}
              {company.location && <p className="mt-1 text-sm text-muted-foreground">{company.location}</p>}
              <p className="mt-3 text-sm">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    company.verified ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning'
                  }`}
                >
                  {company.verified ? 'Verified' : 'Pending verification'}
                </span>
              </p>
              {company.description && (
                <p className="mt-4 text-sm text-muted-foreground">{company.description}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No company linked to your recruiter account yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Contact support to verify your employer profile.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Full company editing coming soon.{' '}
        <Link href="/recruiter/billing" className="text-primary hover:underline">
          Upgrade for verified badge
        </Link>
      </p>
    </div>
  );
}
