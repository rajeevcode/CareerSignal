import { test, expect, type Page } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser } from '../helpers/admin';

/**
 * JD Match panel layout (app/(app)/jd-match/JDMatchClient.tsx).
 *
 * FINDING: the InterviewSignalCard component CAN be sticky (it accepts a
 * `sticky` prop that applies `lg:sticky lg:top-24`), but the JD Match page
 * renders it WITHOUT the sticky prop — so the result panel is NOT sticky on
 * /jd-match. The page is a single-column max-w-4xl layout with the result
 * appearing below the input form.
 *
 * Running a real match needs the AI service, which may be down. So this test
 * stays lenient: it asserts the JD Match form markup exists and is interactive,
 * rather than running a full match.
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

test('JD Match page renders the input form and submit control', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await loginViaUi(page, user.email, 'Passw0rd!');
  await page.goto('/jd-match-tool');

  await expect(page.getByRole('heading', { name: 'JD Match' })).toBeVisible();
  await expect(page.getByPlaceholder('Paste the full job description here...')).toBeVisible();
  await expect(page.getByPlaceholder('Job title (optional)')).toBeVisible();

  // Submit is disabled until a JD is entered, then enabled (panel is reachable).
  const submit = page.getByRole('button', { name: 'Get JD Match Score' });
  await expect(submit).toBeDisabled();
  await page.getByPlaceholder('Paste the full job description here...').fill('Some JD text for a role.');
  await expect(submit).toBeEnabled();
});

test('free-quota indicator is shown on the JD Match page', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await loginViaUi(page, user.email, 'Passw0rd!');
  await page.goto('/jd-match-tool');

  // Free users see "You have N of 3 free JD matches remaining this month".
  await expect(page.getByText(/free JD matches remaining/i)).toBeVisible();
});
