import { expect, type APIResponse } from '@playwright/test';

/** Assert a 402 paywall response with the expected feature key. */
export async function expectPaywall(res: APIResponse, feature: string) {
  expect(res.status(), `expected 402 paywall for ${feature}`).toBe(402);
  const body = await res.json();
  expect(body.upgrade).toBe(true);
  expect(body.feature).toBe(feature);
  expect(typeof body.error).toBe('string');
}

export async function expect402(res: APIResponse) {
  expect(res.status()).toBe(402);
  const body = await res.json();
  expect(body.upgrade).toBe(true);
}
