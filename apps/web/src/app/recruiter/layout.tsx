import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { RecruiterSidebar } from './RecruiterSidebar';

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'recruiter') redirect('/dashboard');

  return (
    <div className="flex min-h-screen bg-background">
      <RecruiterSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
