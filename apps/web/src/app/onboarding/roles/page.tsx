import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId, listCandidateSkills, listCandidateExperience } from '@/lib/queries';
import { TargetRolesClient } from './TargetRolesClient';
import { parseJsonArray } from '@careersignal/db';

export default async function OnboardingRolesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');
  if (candidate.onboardingComplete) redirect('/dashboard');

  if ((candidate.onboardingStep ?? 0) < 1) redirect('/onboarding/cv');
  if ((candidate.onboardingStep ?? 0) < 1) redirect('/onboarding/cv');

  const skills = (await listCandidateSkills(candidate.id)).map((s) => s.skillName);
  const experienceTitles = (await listCandidateExperience(candidate.id)).map((e) => e.title);
  const existingRoles = parseJsonArray<string>(candidate.targetRoles);

  return (
    <TargetRolesClient
      currentTitle={candidate.currentTitle}
      experienceTitles={experienceTitles}
      skills={skills}
      existingRoles={existingRoles}
    />
  );
}
