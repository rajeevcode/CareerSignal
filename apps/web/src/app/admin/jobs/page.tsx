import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { listAllJobs, listCompanies } from '@/lib/queries';
import { AdminJobsClient } from './AdminJobsClient';

export default async function AdminJobsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const jobs = listAllJobs();
  const companies = listCompanies();

  return <AdminJobsClient jobs={jobs} companies={companies} />;
}
