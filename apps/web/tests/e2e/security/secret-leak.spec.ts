import { test, expect } from '@playwright/test';
import { grepNextStaticForSecret } from '../helpers/bundle';

/**
 * The Supabase service-role key must never reach the client bundle.
 * Requires a prior `next build` (skips otherwise).
 */
test.describe('Security: secret leakage (P0)', () => {
  test('SEC-01 service-role key absent from .next/static client JS', async () => {
    const { built, offenders } = grepNextStaticForSecret();
    test.skip(!built, 'No .next/static build found — run `next build` first.');
    expect(offenders, `service-role key found in: ${offenders.join(', ')}`).toEqual([]);
  });
});
