import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateByUserId } from '@/lib/queries';
import { JDMatchClient } from './JDMatchClient';

export default async function JDMatchPage() {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/jd-match');

  const profile = getCandidateByUserId(session.userId);
  if (!profile) redirect('/register');

  return <JDMatchClient candidateId={profile.id} cvScore={profile.cv_score} />;
}
