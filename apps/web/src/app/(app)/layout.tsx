import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { getSession } from '@/lib/auth/session';

export default async function CandidateAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role === 'recruiter') redirect('/recruiter/dashboard');
  if (session.role === 'admin') redirect('/admin');

  return <AppShell>{children}</AppShell>;
}
