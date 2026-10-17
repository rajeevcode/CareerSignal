import { expect, test } from '@playwright/test';
import { BASE_URL, SUPA_URL } from '../e2e/env';
import { registerUser } from '../e2e/helpers/register';
import { adminClient, cleanupUser, seededJobIds, setPlan } from '../e2e/helpers/admin';

// Only disposable test accounts are mutated; all provider-backed actions are avoided.
test('record-backed queue, persistent application controls and outcome analytics', async ({ page, context }, testInfo) => {
  for (const endpoint of [BASE_URL, SUPA_URL]) {
    if (!['localhost', '127.0.0.1'].includes(new URL(endpoint).hostname)) throw new Error('Workflow verification requires local web and Supabase endpoints.');
  }
  const user = await registerUser();
  const admin = adminClient();
  try {
    await setPlan(user.userId, 'pro');
    const { error: profileError } = await admin.from('candidate_profiles').update({ onboarding_complete: true, cv_score: null }).eq('id', user.candidateId);
    expect(profileError).toBeNull();
    const jobId = (await seededJobIds())[0];
    expect(jobId).toBeTruthy();
    const now = new Date().toISOString();
    const { data: app, error } = await admin.from('applications').insert({
      candidate_id: user.candidateId, job_id: jobId, status: 'applied',
      applied_at: now, updated_at: now, follow_up_due_at: '2026-01-01T00:00:00Z', next_action: 'Ask about next steps',
    }).select('id').single();
    expect(error).toBeNull();
    expect(app).toBeTruthy();
    const state = await user.ctx.storageState();
    await context.addCookies(state.cookies);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: "Today's next best actions" })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Follow up:/ })).toHaveCount(1);
    await expect(page.getByText('Prepare STAR stories for 2 upcoming interviews')).toHaveCount(0);
    const completion = page.waitForResponse((response) => response.url().includes(`/api/applications/${app!.id}`) && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Mark follow-up done' }).click();
    expect((await completion).status()).toBe(200);
    await expect(page.getByRole('link', { name: /^Follow up:/ })).toHaveCount(0);
    const { data: completed } = await admin.from('applications').select('follow_up_due_at,next_action').eq('id', app!.id).single();
    expect(completed?.follow_up_due_at).toBeNull();
    expect(completed?.next_action).toBe('Ask about next steps');

    await page.goto('/applications');
    await page.getByLabel('Next action or private note').fill('Send portfolio after technical interview');
    await page.route('**/api/applications/*', (route) => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Conflict' }) }));
    await page.getByRole('button', { name: 'Save note' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'application changed' })).toBeVisible();
    await expect(page.getByLabel('Next action or private note')).toHaveValue('Send portfolio after technical interview');
    await page.unroute('**/api/applications/*');
    const saved = page.waitForResponse((response) => response.url().includes(`/api/applications/${app!.id}`) && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save note' }).click();
    expect((await saved).status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Save note' })).toBeDisabled();
    await page.getByLabel('Application stage').selectOption('technical_round');
    await expect(page.getByLabel('Application stage')).toHaveValue('technical_round');
    await page.reload();
    await expect(page.getByLabel('Next action or private note')).toHaveValue('Send portfolio after technical interview');
    await expect(page.getByLabel('Application stage')).toHaveValue('technical_round');
    await page.screenshot({ path: testInfo.outputPath('application-workspace.png'), fullPage: true });
    await page.getByRole('button', { name: 'analytics', exact: true }).click();
    await expect(page.getByText('100%', { exact: true })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('outcome-analytics.png'), fullPage: true });
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /^Prepare:/ })).toHaveCount(1);
    await page.getByRole('link', { name: /^Prepare:/ }).click();
    await expect(page.getByLabel('Select a job to prep for')).toHaveValue(jobId);
  } finally {
    await cleanupUser(user.email);
    await user.ctx.dispose();
  }
});
