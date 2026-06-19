import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getTier } from '@/lib/access';
import { PageHeader } from '@/components/ui/PageHeader';
import { LockedFeature } from '@/components/ui/LockedFeature';
import { CoverLettersClient } from './CoverLettersClient';

export default async function CoverLettersPage() {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/cover-letters');

  const tier = await getTier(session);
  if (tier !== 'pro') {
    return (
      <>
        <PageHeader title="Cover Letters" subtitle="AI-tailored cover letters per job" />
        <LockedFeature
          level="pro-feature"
          title="AI Cover Letters are a Pro feature"
          description="Generate a tailored, recruiter-ready cover letter for any job in seconds — grounded in your real CV, in the tone you choose."
          preview={
            <div className="space-y-2 p-6">
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
          }
        />
      </>
    );
  }

  return <CoverLettersClient />;
}
