import type { Metadata } from 'next';
import { getPolicy } from '@/lib/policies';
import { PolicyView } from '@/components/cs/PolicyView';

export const metadata: Metadata = {
  title: 'Terms of Service — CareerSignal',
  description: 'The terms that govern your use of CareerSignal.',
};

export default async function TermsPage() {
  const policy = await getPolicy('terms');
  return <PolicyView policy={policy} fallbackTitle="Terms of Service" />;
}
