import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getTier } from '@/lib/access';
import { PageHeader } from '@/components/ui/PageHeader';
import { LockedFeature } from '@/components/ui/LockedFeature';
import { CareerCoachClient } from './CareerCoachClient';

export default async function CareerCoachPage() {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/career-coach');

  const tier = await getTier(session);
  if (tier !== 'pro') {
    return (
      <>
        <PageHeader title="Career Coach" subtitle="Your AI career strategy assistant" />
        <LockedFeature
          level="pro-feature"
          title="Career Coach is a Pro feature"
          description="Upgrade to get personalized job-search strategy, CV rewrites, recruiter messages, and interview prep — on demand."
          preview={
            <div className="space-y-3 p-6">
              <div className="ml-auto h-10 w-2/3 rounded-2xl bg-muted" />
              <div className="h-16 w-3/4 rounded-2xl bg-muted" />
              <div className="ml-auto h-10 w-1/2 rounded-2xl bg-muted" />
            </div>
          }
        />
      </>
    );
  }

  return <CareerCoachClient />;
}
