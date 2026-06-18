import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { listCompanies } from '@/lib/queries';
import { NewJobForm } from './NewJobForm';

export default async function NewJobPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  return <NewJobForm companies={listCompanies()} />;
}
