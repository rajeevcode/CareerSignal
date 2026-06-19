import { test, expect, type Page } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, setPlan } from '../helpers/admin';

/**
 * LockedFeature cards (components/ui/LockedFeature.tsx + AccessBadge).
 *
 * /career-coach is server-gated: a FREE user gets a LockedFeature directly
 * (no client interaction / AI needed). The AccessBadge for level 'pro-feature'
 * renders the TEXT 'Pro Feature' (not color-only) plus an 'Upgrade to Pro' CTA.
 *
 * FINDING: the LockedFeature 'pro-feature' default CTA href is '/pricing#pro'
 * (NOT '/checkout'). The secondary 'View pricing' link goes to '/pricing'.
 */

const emails: string[] = [];

async function loginViaUi(page: Page, email: string, password: string, redirect = '/dashboard') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

test.beforeAll(async () => {
  await preflight();
});

test.afterAll(async () => {
  for (const e of emails) await cleanupUser(e).catch(() => {});
});

test('free user on /career-coach sees a LockedFeature with a "Pro Feature" text badge', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await loginViaUi(page, user.email, 'Passw0rd!');
  await page.goto('/career-coach');

  // AccessBadge text (not color-only): uppercase tracking but text content is "Pro Feature".
  await expect(page.getByText('Pro Feature', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Career Coach is a Pro feature' })).toBeVisible();
});

test('LockedFeature CTAs: "Upgrade to Pro" → /pricing#pro and "View pricing" → /pricing', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await loginViaUi(page, user.email, 'Passw0rd!');
  await page.goto('/career-coach');

  const upgrade = page.getByRole('link', { name: 'Upgrade to Pro' });
  await expect(upgrade).toBeVisible();
  // FINDING: pro-feature LockedFeature CTA points at /pricing#pro, not /checkout.
  await expect(upgrade).toHaveAttribute('href', '/pricing#pro');

  const viewPricing = page.getByRole('link', { name: 'View pricing' });
  await expect(viewPricing).toBeVisible();
  await expect(viewPricing).toHaveAttribute('href', '/pricing');
});

test('PRO user on /career-coach does NOT see the locked card', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await setPlan(user.userId, 'pro');
  await loginViaUi(page, user.email, 'Passw0rd!');
  await page.goto('/career-coach');

  await expect(page.getByText('Pro Feature')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Career Coach is a Pro feature' })).toHaveCount(0);
});
