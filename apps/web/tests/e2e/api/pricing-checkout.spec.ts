import { test, expect } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { adminClient, cleanupUser, getSubscription } from '../helpers/admin';
import { expectPaywall } from '../helpers/assertions';

test.beforeAll(async () => {
  await preflight();
});

async function paymentCount(userId: string): Promise<number> {
  const { count } = await adminClient()
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

// Checkout completion needs no AI service.
test.describe('Pricing / checkout (CHK)', () => {
  test('CHK-01 checkout completes → plan upgraded to pro + payment recorded', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/checkout/complete', { data: {} });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.plan).toBe('pro');

      const sub = await getSubscription(user.userId);
      expect(sub?.plan).toBe('pro');
      expect(await paymentCount(user.userId), 'a payment row should exist').toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('CHK-02 checkout is idempotent — repeat call adds no extra payment', async () => {
    const user = await registerUser();
    try {
      const first = await user.ctx.post('/api/checkout/complete', { data: {} });
      expect(first.status()).toBe(200);
      const afterFirst = await paymentCount(user.userId);

      const second = await user.ctx.post('/api/checkout/complete', { data: {} });
      expect(second.status()).toBe(200);
      expect((await second.json()).success).toBe(true);

      expect(await paymentCount(user.userId), 'payment count must not change on repeat').toBe(afterFirst);
      expect((await getSubscription(user.userId))?.plan).toBe('pro');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('CHK-03 fresh user (no checkout) is free and is paywalled on Pro features', async () => {
    const user = await registerUser();
    try {
      expect((await getSubscription(user.userId))?.plan).toBe('free');

      const res = await user.ctx.post('/api/export-cv', { data: {} });
      await expectPaywall(res, 'export_cv');
    } finally {
      await cleanupUser(user.email);
    }
  });
});
