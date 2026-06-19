import type { Metadata } from 'next';
import { getPolicy } from '@/lib/policies';
import { PolicyView } from '@/components/cs/PolicyView';

export const metadata: Metadata = {
  title: 'Privacy Policy — CareerSignal',
  description: 'How CareerSignal collects, uses, and protects your information.',
};

export default async function PrivacyPage() {
  const policy = await getPolicy('privacy');
  return <PolicyView policy={policy} fallbackTitle="Privacy Policy" />;
}
