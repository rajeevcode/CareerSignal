import { test, expect } from '@playwright/test';
import { preflight } from '../env';

/**
 * Global marketing header (components/cs/SiteHeader.tsx) — the Lovable design
 * chrome, used app-wide. It is a STATIC marketing header (not auth-aware): it
 * always shows the product nav, a theme toggle, and Log in / Get started.
 *
 * (Auth-state-dependent links like Dashboard/Sign out previously lived in the
 * old HeaderClient; the global header no longer varies by auth state.)
 */

test.beforeAll(async () => {
  await preflight();
});

test('header shows the product nav links', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header');
  for (const label of ['Product', 'CV Score', 'JD Match', 'Jobs', 'Demo', 'For Recruiters', 'Pricing']) {
    await expect(header.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
});

test('header shows Log in and Get started auth CTAs', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header');
  await expect(header.getByRole('link', { name: 'Log in' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Get started' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/register');
});

test('header has a theme toggle that switches dark mode', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('header').getByRole('button', { name: /Switch to (dark|light) theme/ });
  await expect(toggle).toBeVisible();

  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await toggle.click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(!before);
});

test('logo links home', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.locator('header').getByRole('link', { name: 'CareerSignal' })).toHaveAttribute('href', '/');
});
