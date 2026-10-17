import { test, expect, type Page } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, setRole } from '../helpers/admin';

/**
 * Routing & role guards (browser).
 * - Public routes load (200, no redirect).
 * - Protected routes redirect a guest to /login?redirect=<path> (enforced by middleware).
 * - Role gates: candidate hitting /admin or /recruiter → /restricted?area=...
 */

const emails: string[] = [];

/** Log in through the real login UI and wait until we've left /login. */
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

const PUBLIC_ROUTES = ['/', '/product', '/pricing', '/jobs', '/demo', '/login', '/register', '/restricted', '/cv-score', '/jd-match', '/for-recruiters', '/contact', '/terms', '/privacy', '/copyright'];

for (const route of PUBLIC_ROUTES) {
  test(`public route ${route} loads without auth redirect`, async ({ page }) => {
    const res = await page.goto(route);
    expect(res, `no response for ${route}`).not.toBeNull();
    expect(res!.status(), `status for ${route}`).toBeLessThan(400);
    // Stays on the requested path — not bounced to /login.
    expect(new URL(page.url()).pathname).toBe(route);
  });
}

// Routes guarded by middleware (lib/auth/middleware.ts) — these preserve the
// original path as ?redirect=<path> when bouncing a guest to /login.
const MIDDLEWARE_PROTECTED = [
  '/dashboard',
  '/cv',
  // The functional JD-match tool moved to /jd-match-tool (the public /jd-match is now
  // the Lovable marketing page). The authed tool stays guarded.
  '/jd-match-tool',
  '/applications',
  '/interview-prep',
  '/cv-builder',
  '/account',
  '/career-coach',
  '/cover-letters',
  '/ats-check',
];

for (const route of MIDDLEWARE_PROTECTED) {
  test(`guest hitting ${route} is redirected to /login?redirect=${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?redirect=/);
    // The redirect target preserves the original path.
    const redirect = new URL(page.url()).searchParams.get('redirect');
    expect(redirect).toBe(route);
  });
}

test('candidate hitting /admin is sent to /restricted?area=admin', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await loginViaUi(page, user.email, 'Passw0rd!');

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/restricted\?area=admin/);
  await expect(page.getByRole('heading', { name: 'Admin access required' })).toBeVisible();
});

test('candidate hitting /recruiter is sent to /restricted?area=recruiter', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await loginViaUi(page, user.email, 'Passw0rd!');

  await page.goto('/recruiter');
  await expect(page).toHaveURL(/\/restricted\?area=recruiter/);
  await expect(page.getByRole('heading', { name: 'Recruiter access required' })).toBeVisible();
});

test('after promotion to admin, /admin is no longer restricted', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await setRole(user.userId, 'admin');
  // Re-login in the browser so the session reflects the new role.
  await loginViaUi(page, user.email, 'Passw0rd!', '/admin');

  await page.goto('/admin');
  // Should NOT bounce to /restricted.
  await expect(page).not.toHaveURL(/\/restricted/);
  expect(new URL(page.url()).pathname.startsWith('/admin')).toBe(true);
});
