import { test, expect } from '@playwright/test';
import { preflight } from '../env';

/**
 * Lightweight accessibility checks for the auth forms.
 *
 * login/page.tsx and register/page.tsx now wire each <input> to its <label>
 * via htmlFor/id, and field errors are wired via aria-describedby + role=alert.
 * We assert the inputs exist, are typed correctly, are reachable by label
 * (getByLabel = programmatic association), and the submit button has a name.
 */

test.beforeAll(async () => {
  await preflight();
});

test('login form: email + password inputs and labels are present', async ({ page }) => {
  await page.goto('/login');

  const email = page.getByLabel('Email', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(email).toHaveAttribute('type', 'email');
  await expect(password).toHaveAttribute('type', 'password');

  // Submit control has an accessible name.
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('register form: name + email + password inputs and labels are present', async ({ page }) => {
  await page.goto('/register');

  // Reachable by label (programmatic association via htmlFor/id).
  await expect(page.getByLabel('Full name', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Confirm password', { exact: true })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Create free account' })).toBeVisible();
});

test('every page has exactly one h1 (login/register/pricing/jobs)', async ({ page }) => {
  for (const route of ['/login', '/register', '/pricing', '/jobs']) {
    await page.goto(route);
    await expect(page.locator('h1'), `h1 count on ${route}`).toHaveCount(1);
  }
});

test('register password fields show an inline error below the minimum length', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Create free account' }).click();
  // Inline (non-native) validation surfaces a role=alert message, not a tooltip.
  await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible();
});
