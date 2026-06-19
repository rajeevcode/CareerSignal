import { test, expect } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, countRows, seededJobIds, adminClient } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Saved jobs — POST /api/save-job (SAV)', () => {
  test('SAV-01 save / unsave / re-save lifecycle', async () => {
    const user = await registerUser();
    try {
      const jobId = (await seededJobIds())[0];
      expect(jobId, 'expected a seeded job').toBeTruthy();

      // Save → 1 row.
      let res = await user.ctx.post('/api/save-job', { data: { job_id: jobId } });
      expect(res.status()).toBe(200);
      expect(await countRows('saved_jobs', user.candidateId)).toBe(1);

      // Unsave → 0 rows.
      res = await user.ctx.post('/api/save-job', { data: { job_id: jobId, unsave: true } });
      expect(res.status()).toBe(200);
      expect(await countRows('saved_jobs', user.candidateId)).toBe(0);

      // Re-save after unsave is allowed → 1 row.
      res = await user.ctx.post('/api/save-job', { data: { job_id: jobId } });
      expect(res.status()).toBe(200);
      expect(await countRows('saved_jobs', user.candidateId)).toBe(1);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('SAV-02 catalog has at least 20 published jobs', async () => {
    const { count } = await adminClient()
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');
    expect(count ?? 0, 'expected >= 20 published jobs seeded').toBeGreaterThanOrEqual(20);
  });
});
