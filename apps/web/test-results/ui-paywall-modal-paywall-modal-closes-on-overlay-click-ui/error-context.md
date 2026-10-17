# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui/paywall-modal.spec.ts >> paywall modal closes on overlay click
- Location: tests/e2e/ui/paywall-modal.spec.ts:81:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | import { preflight } from '../env';
  3  | import { registerUser } from '../helpers/register';
  4  | import { cleanupUser, setJdUsage } from '../helpers/admin';
  5  | 
  6  | /**
  7  |  * Paywall modal (Modal.tsx + PaywallModal.tsx via PaywallProvider/usePaywall).
  8  |  *
  9  |  * Deterministic trigger WITHOUT the AI service: in app/api/match-jd the Free
  10 |  * monthly quota (402) is checked BEFORE the AI call. We fast-forward the free
  11 |  * user's JD usage to the limit (3), then submitting any JD returns 402 and the
  12 |  * client opens the paywall.
  13 |  *
  14 |  * a11y NOTE: the Modal supports Escape + overlay click to close, but it does
  15 |  * NOT trap Tab focus — Tab-trapping is a known a11y gap (documented, not failed).
  16 |  */
  17 | 
  18 | const emails: string[] = [];
  19 | 
  20 | async function loginViaUi(page: Page, email: string, password: string, redirect = '/dashboard') {
  21 |   await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  22 |   await page.locator('input[type=email]').fill(email);
  23 |   await page.locator('input[type=password]').fill(password);
  24 |   await page.getByRole('button', { name: 'Login' }).click();
> 25 |   await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  26 | }
  27 | 
  28 | async function triggerPaywallOnJdMatch(page: Page) {
  29 |   await page.goto('/jd-match-tool');
  30 |   await page.getByPlaceholder('Paste the full job description here...').fill(
  31 |     'Senior Product Manager. Requirements: 5 years experience, SQL, analytics, roadmap ownership.',
  32 |   );
  33 |   await page.getByRole('button', { name: 'Get JD Match Score' }).click();
  34 | }
  35 | 
  36 | test.beforeAll(async () => {
  37 |   await preflight();
  38 | });
  39 | 
  40 | test.afterAll(async () => {
  41 |   for (const e of emails) await cleanupUser(e).catch(() => {});
  42 | });
  43 | 
  44 | test('free user over JD quota opens the Pro paywall modal', async ({ page }) => {
  45 |   const user = await registerUser();
  46 |   emails.push(user.email);
  47 |   await setJdUsage(user.userId, 3); // free limit reached
  48 |   await loginViaUi(page, user.email, 'Passw0rd!');
  49 | 
  50 |   await triggerPaywallOnJdMatch(page);
  51 | 
  52 |   const dialog = page.getByRole('dialog');
  53 |   await expect(dialog).toBeVisible();
  54 |   await expect(dialog).toHaveAttribute('aria-modal', 'true');
  55 |   await expect(dialog.getByText('Unlock CareerSignal Pro')).toBeVisible();
  56 | 
  57 |   // CTA "Upgrade to Pro — ₹749 / month" → /checkout (partial name match).
  58 |   const upgrade = dialog.getByRole('link', { name: /Upgrade to Pro/ });
  59 |   await expect(upgrade).toBeVisible();
  60 |   await expect(upgrade).toHaveAttribute('href', '/checkout');
  61 | 
  62 |   // "View pricing" → /pricing.
  63 |   const viewPricing = dialog.getByRole('link', { name: 'View pricing' });
  64 |   await expect(viewPricing).toBeVisible();
  65 |   await expect(viewPricing).toHaveAttribute('href', '/pricing');
  66 | });
  67 | 
  68 | test('paywall modal closes on Escape', async ({ page }) => {
  69 |   const user = await registerUser();
  70 |   emails.push(user.email);
  71 |   await setJdUsage(user.userId, 3);
  72 |   await loginViaUi(page, user.email, 'Passw0rd!');
  73 | 
  74 |   await triggerPaywallOnJdMatch(page);
  75 |   await expect(page.getByRole('dialog')).toBeVisible();
  76 | 
  77 |   await page.keyboard.press('Escape');
  78 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  79 | });
  80 | 
  81 | test('paywall modal closes on overlay click', async ({ page }) => {
  82 |   const user = await registerUser();
  83 |   emails.push(user.email);
  84 |   await setJdUsage(user.userId, 3);
  85 |   await loginViaUi(page, user.email, 'Passw0rd!');
  86 | 
  87 |   await triggerPaywallOnJdMatch(page);
  88 |   await expect(page.getByRole('dialog')).toBeVisible();
  89 | 
  90 |   // The overlay is a full-screen button labelled "Close". Click near a corner
  91 |   // so the pointer lands on the overlay, not the centered dialog content.
  92 |   await page.getByRole('button', { name: 'Close', exact: true }).click({ position: { x: 5, y: 5 } });
  93 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  94 | });
  95 | 
```