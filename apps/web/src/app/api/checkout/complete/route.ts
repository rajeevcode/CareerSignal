import { NextResponse } from 'next/server';
import { getSession, refreshSessionPlan } from '@/lib/auth/session';
import { activateProMock } from '@/lib/services/billing';

/**
 * Mock checkout completion (development only). Activates Pro via the billing
 * service (idempotent, records a mock payment). In production, Pro activation
 * must come from a verified Stripe webhook — not this route.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Deny by default in EVERY environment. Mock Pro activation is unlocked only
  // by an explicit opt-in flag — never inferred from NODE_ENV, which is unset or
  // non-'production' on staging/preview deploys (where this route would
  // otherwise hand out free Pro). In production, Pro must come from a verified
  // payment webhook.
  if (process.env.ALLOW_MOCK_CHECKOUT !== 'true') {
    return NextResponse.json(
      { error: 'Checkout is not available. Stripe is not configured.' },
      { status: 503 },
    );
  }

  await activateProMock(session.userId);
  await refreshSessionPlan(session);
  return NextResponse.json({ success: true, plan: 'pro' });
}
