import { test, expect, type Page } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, setJdUsage } from '../helpers/admin';

/**
 * Paywall modal (Modal.tsx + PaywallModal.tsx via PaywallProvider/usePaywall).
 *
 * Deterministic trigger WITHOUT the AI service: in app/api/match-jd the Free
 * monthly quota (402) is checked BEFORE the AI call. We fast-forward the free
 * user's JD usage to the limit (3), then submitting any JD returns 402 and the
 * client opens the paywall.
 *
 * a11y NOTE: the Modal supports Escape + overlay click to close, but it does
 * NOT trap Tab focus — Tab-trapping is a known a11y gap (documented, not failed).
 */

const emails: string[] = [];

async function loginViaUi(page: Page, email: string, password: string, redirect = '/dashboard') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

async function triggerPaywallOnJdMatch(page: Page) {
  await page.goto('/jd-match-tool');
  await page.getByPlaceholder('Paste the full job description here...').fill(
    'Senior Product Manager. Requirements: 5 years experience, SQL, analytics, roadmap ownership.',
  );
  await page.getByRole('button', { name: 'Get JD Match Score' }).click();
}

test.beforeAll(async () => {
  await preflight();
});

test.afterAll(async () => {
  for (const e of emails) await cleanupUser(e).catch(() => {});
});

test('free user over JD quota opens the Pro paywall modal', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await setJdUsage(user.userId, 3); // free limit reached
  await loginViaUi(page, user.email, 'Passw0rd!');

  await triggerPaywallOnJdMatch(page);

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByText('Unlock CareerSignal Pro')).toBeVisible();

  // CTA "Upgrade to Pro — ₹749 / month" → /checkout (partial name match).
  const upgrade = dialog.getByRole('link', { name: /Upgrade to Pro/ });
  await expect(upgrade).toBeVisible();
  await expect(upgrade).toHaveAttribute('href', '/checkout');

  // "View pricing" → /pricing.
  const viewPricing = dialog.getByRole('link', { name: 'View pricing' });
  await expect(viewPricing).toBeVisible();
  await expect(viewPricing).toHaveAttribute('href', '/pricing');
});

test('paywall modal closes on Escape', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await setJdUsage(user.userId, 3);
  await loginViaUi(page, user.email, 'Passw0rd!');

  await triggerPaywallOnJdMatch(page);
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('paywall modal closes on overlay click', async ({ page }) => {
  const user = await registerUser();
  emails.push(user.email);
  await setJdUsage(user.userId, 3);
  await loginViaUi(page, user.email, 'Passw0rd!');

  await triggerPaywallOnJdMatch(page);
  await expect(page.getByRole('dialog')).toBeVisible();

  // The overlay is a full-screen button labelled "Close". Click near a corner
  // so the pointer lands on the overlay, not the centered dialog content.
  await page.getByRole('button', { name: 'Close', exact: true }).click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
