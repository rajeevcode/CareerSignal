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

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_CHECKOUT !== 'true') {
    return NextResponse.json(
      { error: 'Checkout is not available. Stripe is not configured.' },
      { status: 503 },
    );
  }

  await activateProMock(session.userId);
  await refreshSessionPlan(session);
  return NextResponse.json({ success: true, plan: 'pro' });
}
