import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateByUserId, listCvUploads } from '@/lib/queries';
import { getPlanStateForUser } from '@/lib/access';
import { remaining } from '@/lib/billing';
import { JDMatchClient } from './JDMatchClient';

export default async function JDMatchPage() {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/jd-match');

  const profile = await getCandidateByUserId(session.userId);
  if (!profile) redirect('/register');

  const uploads=await listCvUploads(profile.id);
  const hasCv=uploads.some(upload=>upload.isPrimary&&Boolean(upload.parsedText?.trim()));
  const planState = await getPlanStateForUser(session.userId);
  const left = remaining(planState);

  return (
    <JDMatchClient
      candidateId={profile.id}
      cvScore={profile.cv_score}
      hasCv={hasCv}
      isPro={planState.plan === 'pro'}
      jdRemaining={left ? left.jdMatches : null}
    />
  );
}
