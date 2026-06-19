import { test, expect } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, seededJobIds, countRows } from '../helpers/admin';
import { expectPaywall } from '../helpers/assertions';

test.beforeAll(async () => {
  await preflight();
});

// Saving and applying need no AI service.
test.describe('Saved jobs limit — free plan = 5 (LIM-SV)', () => {
  test('LIM-SV-01 save 5 distinct jobs → 200, 6th distinct → 402 save_job', async () => {
    const user = await registerUser();
    try {
      const jobs = await seededJobIds(8);
      expect(jobs.length, 'need ≥6 seeded jobs').toBeGreaterThanOrEqual(6);

      for (let i = 0; i < 5; i++) {
        const res = await user.ctx.post('/api/save-job', { data: { job_id: jobs[i] } });
        expect(res.status(), `save #${i + 1} should succeed`).toBe(200);
      }
      const sixth = await user.ctx.post('/api/save-job', { data: { job_id: jobs[5] } });
      await expectPaywall(sixth, 'save_job');

      expect(await countRows('saved_jobs', user.candidateId)).toBe(5);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('LIM-SV-02 duplicate save of the same job is idempotent (1 row)', async () => {
    const user = await registerUser();
    try {
      const [jobId] = await seededJobIds(1);
      const first = await user.ctx.post('/api/save-job', { data: { job_id: jobId } });
      const second = await user.ctx.post('/api/save-job', { data: { job_id: jobId } });
      expect(first.status()).toBe(200);
      expect(second.status()).toBe(200);
      expect(await countRows('saved_jobs', user.candidateId)).toBe(1);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('LIM-SV-03 unsave decrements the saved count', async () => {
    const user = await registerUser();
    try {
      const [jobId] = await seededJobIds(1);
      await user.ctx.post('/api/save-job', { data: { job_id: jobId } });
      expect(await countRows('saved_jobs', user.candidateId)).toBe(1);

      const unsave = await user.ctx.post('/api/save-job', { data: { job_id: jobId, unsave: true } });
      expect(unsave.status()).toBe(200);
      expect(await countRows('saved_jobs', user.candidateId)).toBe(0);
    } finally {
      await cleanupUser(user.email);
    }
  });
});

test.describe('Applications (LIM-AP)', () => {
  test('LIM-AP-01 apply creates an application (is_new:true), re-apply is idempotent', async () => {
    const user = await registerUser();
    try {
      const [jobId] = await seededJobIds(1);
      const first = await user.ctx.post('/api/apply', { data: { job_id: jobId } });
      expect(first.status()).toBe(200);
      expect((await first.json()).is_new).toBe(true);

      const again = await user.ctx.post('/api/apply', { data: { job_id: jobId } });
      expect(again.status()).toBe(200);
      expect((await again.json()).is_new).toBe(false);

      expect(await countRows('applications', user.candidateId)).toBe(1);
    } finally {
      await cleanupUser(user.email);
    }
  });

  // Free plan caps tracked applications at 10 (track_application gate in
  // /api/apply). The 11th distinct application is paywalled.
  test('LIM-AP-02 free user can track 10 applications, 11th → 402', async () => {
    const user = await registerUser();
    try {
      const jobs = await seededJobIds(11);
      expect(jobs.length, 'need 11 seeded jobs for the cap probe').toBeGreaterThanOrEqual(11);

      for (let i = 0; i < 10; i++) {
        const res = await user.ctx.post('/api/apply', { data: { job_id: jobs[i] } });
        expect(res.status(), `application #${i + 1} should succeed under the cap`).toBe(200);
      }
      const blocked = await user.ctx.post('/api/apply', { data: { job_id: jobs[10] } });
      await expectPaywall(blocked, 'track_application');
      expect(await countRows('applications', user.candidateId)).toBe(10);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('LIM-AP-03 re-applying to an already-tracked job is allowed even at the cap', async () => {
    const user = await registerUser();
    try {
      const jobs = await seededJobIds(10);
      for (let i = 0; i < 10; i++) {
        await user.ctx.post('/api/apply', { data: { job_id: jobs[i] } });
      }
      // At the 10-cap, re-applying to an EXISTING tracked job still works
      // (it doesn't add a row).
      const reapply = await user.ctx.post('/api/apply', { data: { job_id: jobs[0] } });
      expect(reapply.status()).toBe(200);
      expect((await reapply.json()).is_new).toBe(false);
      expect(await countRows('applications', user.candidateId)).toBe(10);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
