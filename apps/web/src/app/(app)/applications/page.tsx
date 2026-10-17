import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getTier } from '@/lib/access';
import { getCandidateRowByUserId, listApplicationsWithJobs } from '@/lib/queries';
import { applicationAnalytics } from '@/lib/career-actions';
import { ApplicationsClient } from './ApplicationsClient';

export default async function ApplicationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');
  const [rows, tier] = await Promise.all([listApplicationsWithJobs(candidate.id), getTier(session)]);
  return <ApplicationsClient applications={rows} isPro={tier === 'pro'} analytics={applicationAnalytics(rows)} />;
}
