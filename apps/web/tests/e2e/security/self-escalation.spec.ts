import { test, expect } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { rawRest } from '../helpers/rest';
import { cleanupUser, getSubscription, getUsage } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

/**
 * Self-privilege-escalation via PostgREST with the user's own JWT.
 *
 * FIXED (migration 20260619000002): `subscriptions` and `usage_limits` policies
 * are now SELECT-only (`p_subs_self_read` / `p_usage_self_read`). Users can read
 * their own billing/usage rows but cannot write them — all writes go through the
 * server (service role). These tests assert the write is denied.
 */
test.describe('Security: self-escalation (P0)', () => {
  test('ESC-01 user cannot self-set subscription plan=pro via REST', async () => {
    const u = await registerUser();
    try {
      await rawRest(u.accessToken, `subscriptions?user_id=eq.${u.userId}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ plan: 'pro' }),
      });
      const sub = await getSubscription(u.userId);
      // SECURE expectation: the self-upgrade is rejected and plan stays free.
      expect(sub?.plan).toBe('free');
    } finally {
      await cleanupUser(u.email);
    }
  });

  test('ESC-02 user cannot self-reset usage_limits via REST', async () => {
    const u = await registerUser();
    try {
      // Seed a non-zero counter via the server-side admin path, then attempt to
      // reset it as the user — RLS must reject the write.
      const { setJdUsage, currentMonth } = await import('../helpers/admin');
      await setJdUsage(u.userId, 3, currentMonth());
      await rawRest(u.accessToken, `usage_limits?user_id=eq.${u.userId}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ jd_match_count_monthly: 0 }),
      });
      const usage = await getUsage(u.userId);
      // SECURE: the self-write is denied; the server-set value stands.
      expect(usage?.jd_match_count_monthly).toBe(3);
    } finally {
      await cleanupUser(u.email);
    }
  });

  test('ESC-03 user cannot insert a subscription row via REST', async () => {
    const u = await registerUser();
    try {
      const res = await rawRest(u.accessToken, 'subscriptions', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: u.userId, plan: 'pro' }),
      });
      // Blocked at the RLS layer (SELECT-only policy → no INSERT, 403) — an even
      // stronger guard than the user_id UNIQUE constraint (409). Either denies it.
      expect([403, 409]).toContain(res.status);
      // And the user is still on the free plan.
      const sub = await getSubscription(u.userId);
      expect(sub?.plan).toBe('free');
    } finally {
      await cleanupUser(u.email);
    }
  });
});
