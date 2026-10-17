import { test, expect } from '@playwright/test';
import { preflight } from '../env';

/**
 * Jobs page filters — responsive behaviour (jobs/page.tsx + FilterSidebar.tsx).
 *
 * FINDING: the jobs page does NOT implement a mobile filter drawer/toggle.
 * The FilterSidebar is an always-rendered <aside> inside a CSS grid
 * (`grid lg:grid-cols-4`). On mobile the grid collapses to one column, so the
 * filters simply STACK ABOVE the job list — they are always visible, there is
 * no "Filters" toggle button to open/close a drawer.
 *
 * These tests assert the REAL behaviour (filters always present and reachable
 * on both mobile and desktop) rather than asserting a drawer that doesn't exist.
 */

test.beforeAll(async () => {
  await preflight();
});

test('mobile (390x844): filters are visible inline (no drawer) and usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/jobs');

  // The filter panel header and inputs are present without any toggle interaction.
  await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
  await expect(page.getByPlaceholder('Role, skill, company...')).toBeVisible();
  await expect(page.getByPlaceholder('City or country')).toBeVisible();

  // FINDING: there is NO mobile "Filters" toggle button (no drawer is implemented).
  await expect(page.getByRole('button', { name: /filter/i })).toHaveCount(0);
});

test('desktop (1280x800): filters are inline alongside the job list', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/jobs');

  await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
  await expect(page.getByPlaceholder('Role, skill, company...')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Find Jobs' })).toBeVisible();
});

test('mobile filter input updates the URL query (filters are functional)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/jobs');

  await page.getByPlaceholder('Role, skill, company...').fill('product');
  // FilterSidebar pushes /jobs?q=... on change.
  await page.waitForURL(/\/jobs\?.*q=product/, { timeout: 10_000 });
  expect(new URL(page.url()).searchParams.get('q')).toBe('product');
});
