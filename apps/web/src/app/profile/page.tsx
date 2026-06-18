import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateByUserId } from '@/lib/queries';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const profile = getCandidateByUserId(session.userId);
  if (!profile) redirect('/register');

  return <ProfileForm profile={profile} />;
}
