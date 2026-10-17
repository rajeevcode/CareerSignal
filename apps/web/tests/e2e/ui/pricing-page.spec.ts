import { test, expect } from '@playwright/test';
import { preflight } from '../env';

/**
 * Pricing page (pricing/page.tsx) — Lovable design, canonical.
 * Audience tabs (candidate / recruiter / Career Center); candidate is default
 * with Free ($0) and Pro ($9 / month).
 */

test.beforeAll(async () => {
  await preflight();
});

test('pricing shows Free ($0) and Pro ($9 / month) on the candidate tab', async ({ page }) => {
  await page.goto('/pricing');

  await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible();
  await expect(page.getByText('$0', { exact: true })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible();
  await expect(page.getByText('$9', { exact: true })).toBeVisible();
  await expect(page.getByText('/ month', { exact: true }).first()).toBeVisible();
});

test('audience tabs switch the plans (recruiter)', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('button', { name: 'recruiter' }).click();
  await expect(page.getByRole('heading', { name: 'Recruit', exact: true })).toBeVisible();
  await expect(page.getByText('$49', { exact: true })).toBeVisible();
});

test('Pro CTA "Upgrade to Pro" links to /checkout', async ({ page }) => {
  await page.goto('/pricing');
  const cta = page.getByRole('link', { name: 'Upgrade to Pro' });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', '/checkout');
});

test('Pro card lists at least one benefit', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByText('Unlimited JD matching')).toBeVisible();
});
