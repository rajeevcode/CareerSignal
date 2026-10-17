import type { Metadata } from 'next';
import { getPolicy } from '@/lib/policies';
import { PolicyView } from '@/components/cs/PolicyView';

export const metadata: Metadata = {
  title: 'Copyright & DMCA — CareerSignal',
  description: 'CareerSignal copyright, trademark, and DMCA policy.',
};

export default async function CopyrightPage() {
  const policy = await getPolicy('copyright');
  return <PolicyView policy={policy} fallbackTitle="Copyright & DMCA Policy" />;
}
