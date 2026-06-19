import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { parseJsonArray, parseJsonObject } from '@careersignal/db';
import { ResultsClient } from './ResultsClient';

export default async function ResultsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  const feedback = parseJsonObject<{ good?: string[]; weak?: string[] }>(candidate.cvFeedbackJson);
  const roles = parseJsonArray<string>(candidate.targetRoles);

  return (
    <ResultsClient
      cvScore={candidate.cvScore}
      bestRole={roles[0] || candidate.currentTitle || 'Product Manager'}
      strengths={(feedback?.good || []).slice(0, 4)}
      gaps={(feedback?.weak || []).slice(0, 4)}
    />
  );
}
