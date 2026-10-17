import { NextResponse } from 'next/server';

/**
 * Stripe webhook endpoint (SCAFFOLD — not wired yet).
 *
 * TODO(stripe):
 *  1. Verify the signature with STRIPE_WEBHOOK_SECRET (stripe.webhooks.constructEvent).
 *  2. On `checkout.session.completed` / `customer.subscription.updated`:
 *       - look up the user by provider_customer_id (stored at checkout),
 *       - update subscriptions { plan:'pro', status, provider:'stripe',
 *         provider_subscription_id, current_period_end },
 *       - insert a payments row.
 *  3. On `customer.subscription.deleted` / `invoice.payment_failed`:
 *       - set subscriptions.status accordingly ('cancelled' | 'past_due') and
 *         downgrade plan to 'free' when the period ends.
 *
 * This is the ONLY path allowed to grant Pro in production.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Stripe webhook not configured', todo: true },
    { status: 501 },
  );
}
