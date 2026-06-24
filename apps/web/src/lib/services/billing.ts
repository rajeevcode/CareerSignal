import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb, subscriptions, payments, newId, toIsoNow } from '@careersignal/db';

// CareerSignal Pro is ₹749/month (≈ $9). Real Stripe wiring is TODO (see below).
export const PRO_AMOUNT_INR = 749;

export async function getSubscription(userId: string) {
  const db = getDb();
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function isProUser(userId: string): Promise<boolean> {
  // Single source of truth — keep this in lockstep with the gating path.
  const { getUserPlan } = await import('@/lib/access');
  return (await getUserPlan(userId)) === 'pro';
}

/**
 * Mock Pro activation (development). Idempotent.
 * In production, Pro must be activated ONLY via a verified Stripe webhook
 * (see app/api/stripe/webhook/route.ts) — never trust the client.
 */
export async function activateProMock(userId: string) {
  const db = getDb();
  const now = toIsoNow();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const existing = await getSubscription(userId);
  if (existing?.plan !== 'pro') {
    await db
      .update(subscriptions)
      .set({
        plan: 'pro',
        status: 'active',
        provider: 'mock',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, userId));

    await db.insert(payments).values({
      id: newId(),
      userId,
      provider: 'mock',
      providerPaymentId: `mock_${newId()}`,
      amount: PRO_AMOUNT_INR,
      currency: 'INR',
      status: 'succeeded',
      createdAt: now,
    });
  }
}

// TODO(stripe): createCheckoutSession(userId) -> Stripe Checkout URL using
//   STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY.
// TODO(stripe): handleWebhook(event) -> on `checkout.session.completed` /
//   `customer.subscription.updated`, set subscriptions {plan, status,
//   provider:'stripe', provider_customer_id, provider_subscription_id,
//   current_period_end} and insert a payments row. Only this path may grant Pro
//   in production.
