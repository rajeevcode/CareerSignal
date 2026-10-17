import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getRecruiterProfile, listCompanies } from '@/lib/queries';
import { NewJobForm } from '@/app/admin/jobs/new/NewJobForm';

export default async function RecruiterNewJobPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'recruiter') redirect('/dashboard');

  const profile = await getRecruiterProfile(session.userId);
  const allCompanies = await listCompanies();
  const companies = profile?.company
    ? [profile.company]
    : allCompanies.length > 0
      ? [allCompanies[0]]
      : [];

  return (
    <NewJobForm
      companies={companies}
      apiPath="/api/recruiter/jobs"
      redirectPath="/recruiter/jobs"
      showCompanyPicker={!profile?.company}
    />
  );
}
