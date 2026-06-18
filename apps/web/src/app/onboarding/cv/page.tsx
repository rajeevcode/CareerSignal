import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId, listCvUploads } from '@/lib/queries';
import { OnboardingCVClient } from './OnboardingCVClient';

export default async function OnboardingCVPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  if (candidate.onboardingComplete) redirect('/dashboard');

  const cvs = listCvUploads(candidate.id);
  if (cvs.length > 0 && (candidate.onboardingStep ?? 0) >= 1) {
    redirect('/onboarding/profile');
  }

  return <OnboardingCVClient candidateId={candidate.id} />;
}
