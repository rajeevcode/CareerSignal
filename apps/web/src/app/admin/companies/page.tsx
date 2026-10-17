import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { listUnverifiedCompanies } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export default async function AdminCompaniesPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const companies = await listUnverifiedCompanies();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-primary hover:underline">
        ← Trust dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">Company verification</h1>
      <p className="mt-1 text-sm text-muted-foreground">{companies.length} companies awaiting review</p>

      <div className="mt-8 overflow-x-auto card-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  All companies are verified.
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{company.name}</td>
                  <td className="px-4 py-3">{company.industry || '—'}</td>
                  <td className="px-4 py-3">{company.location || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(company.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      disabled
                      title="Verification actions coming soon"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
