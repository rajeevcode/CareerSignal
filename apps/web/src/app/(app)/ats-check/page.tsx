import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getTier } from '@/lib/access';
import { AtsCheckClient } from './AtsCheckClient';

export default async function AtsCheckPage() {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/ats-check');

  const tier = await getTier(session);
  return <AtsCheckClient isPro={tier === 'pro'} />;
}
