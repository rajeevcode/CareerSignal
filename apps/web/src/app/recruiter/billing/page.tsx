import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check } from 'lucide-react';
import { getSession } from '@/lib/auth/session';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    features: ['1 active job', 'Basic applicant list', 'Email support'],
    current: true,
  },
  {
    name: 'Growth',
    price: '₹9,999/mo',
    features: ['5 active jobs', 'Shortlist & messaging', 'Verified company badge', 'Priority support'],
    current: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited jobs', 'ATS integrations', 'Dedicated success manager', 'SLA'],
    current: false,
  },
];

export default async function RecruiterBillingPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'recruiter') redirect('/dashboard');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Billing & plans</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose the right plan for your hiring volume</p>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`card-surface p-6 ${plan.current ? 'ring-2 ring-primary' : ''}`}
          >
            {plan.current && (
              <span className="text-xs font-medium text-primary">Current plan</span>
            )}
            <h2 className="mt-1 text-lg font-semibold text-foreground">{plan.name}</h2>
            <p className="mt-2 text-2xl font-bold text-foreground">{plan.price}</p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {feature}
                </li>
              ))}
            </ul>
            {!plan.current && (
              <button type="button" className="btn-primary mt-6 w-full py-2 text-sm" disabled>
                Coming soon
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Questions?{' '}
        <Link href="/for-employers" className="text-primary hover:underline">
          Contact sales
        </Link>
      </p>
    </div>
  );
}
