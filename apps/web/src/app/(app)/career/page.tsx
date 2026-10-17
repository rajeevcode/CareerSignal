import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { loadCareerWorkspace } from '@/lib/career-workspace';
import { CareerWorkspaceClient } from './CareerWorkspaceClient';
export default async function CareerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; connection?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');
  const params = await searchParams;
  return (
    <CareerWorkspaceClient
      data={await loadCareerWorkspace(candidate.id)}
      initialTab={params.tab}
      connectionResult={params.connection}
    />
  );
}
