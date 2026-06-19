import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateByUserId, getCandidateRowByUserId, listCandidateSkills, listCandidateExperience, listCvUploads } from '@/lib/queries';
import { ProfileReviewClient } from './ProfileReviewClient';

export default async function OnboardingProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidateRow = await getCandidateRowByUserId(session.userId);
  if (!candidateRow) redirect('/register');
  if (candidateRow.onboardingComplete) redirect('/dashboard');

  const cvs = await listCvUploads(candidateRow.id);
  if (cvs.length === 0) redirect('/onboarding/cv');

  const profile = (await getCandidateByUserId(session.userId))!;
  const skills = (await listCandidateSkills(candidateRow.id)).map((s) => s.skillName);
  const experience = (await listCandidateExperience(candidateRow.id)).map((e) => ({
    id: e.id,
    company: e.company,
    title: e.title,
    start_date: e.startDate,
    end_date: e.endDate,
  }));

  return (
    <ProfileReviewClient
      profile={{
        current_title: profile.current_title,
        location: profile.location,
        total_experience_years: profile.total_experience_years,
        profile_summary: profile.profile_summary,
        cv_score: profile.cv_score,
      }}
      skills={skills}
      experience={experience}
    />
  );
}
