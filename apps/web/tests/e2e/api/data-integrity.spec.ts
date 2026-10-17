import { test, expect } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, getUsage, countRows, seededJobIds } from '../helpers/admin';
import { rawRest } from '../helpers/rest';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Data integrity & invariants (DAT)', () => {
  test('DAT-01 empty JD does not increment usage', async () => {
    const user = await registerUser();
    try {
      const before = await getUsage(user.userId);
      const res = await user.ctx.post('/api/match-jd', { data: { jd_text: '' } });
      expect(res.status()).toBe(400);
      const after = await getUsage(user.userId);
      expect(after?.jd_match_count_monthly).toBe(before?.jd_match_count_monthly ?? 0);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('DAT-02 unsave decrements saved_jobs back to zero', async () => {
    const user = await registerUser();
    try {
      const jobId = (await seededJobIds())[0];
      await user.ctx.post('/api/save-job', { data: { job_id: jobId } });
      expect(await countRows('saved_jobs', user.candidateId)).toBe(1);
      await user.ctx.post('/api/save-job', { data: { job_id: jobId, unsave: true } });
      expect(await countRows('saved_jobs', user.candidateId)).toBe(0);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('DAT-03 duplicate save does not create a second row', async () => {
    const user = await registerUser();
    try {
      const jobId = (await seededJobIds())[0];
      await user.ctx.post('/api/save-job', { data: { job_id: jobId } });
      await user.ctx.post('/api/save-job', { data: { job_id: jobId } });
      expect(await countRows('saved_jobs', user.candidateId)).toBe(1);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('DAT-04 duplicate application does not create a second row', async () => {
    const user = await registerUser();
    try {
      const jobId = (await seededJobIds())[0];
      await user.ctx.post('/api/apply', { data: { job_id: jobId } });
      await user.ctx.post('/api/apply', { data: { job_id: jobId } });
      expect(await countRows('applications', user.candidateId)).toBe(1);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('DAT-05 user cannot insert usage_limits via REST (RLS denies; unique backstops)', async () => {
    const user = await registerUser();
    try {
      const res = await rawRest(user.accessToken, 'usage_limits', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.userId }),
      });
      // SELECT-only RLS blocks the insert (403); the user_id UNIQUE constraint is
      // a further backstop (409). Either status denies the write.
      expect([403, 409]).toContain(res.status);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
