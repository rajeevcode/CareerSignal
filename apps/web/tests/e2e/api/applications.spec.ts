import { test, expect } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, countRows, seededJobIds } from '../helpers/admin';
import { restAsUser, rawRest } from '../helpers/rest';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Applications — POST /api/apply (APP)', () => {
  test('APP-01 apply is idempotent (is_new true then false, single row)', async () => {
    const user = await registerUser();
    try {
      const jobId = (await seededJobIds())[0];
      expect(jobId, 'expected a seeded job').toBeTruthy();

      const first = await user.ctx.post('/api/apply', { data: { job_id: jobId } });
      expect(first.status()).toBe(200);
      expect((await first.json()).is_new, 'first apply is new').toBe(true);

      const second = await user.ctx.post('/api/apply', { data: { job_id: jobId } });
      expect(second.status()).toBe(200);
      expect((await second.json()).is_new, 're-apply is not new').toBe(false);

      expect(await countRows('applications', user.candidateId)).toBe(1);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('APP-02 invalid status via REST PATCH → 400 (enum CHECK rejects)', async () => {
    const user = await registerUser();
    try {
      const jobId = (await seededJobIds())[0];
      const apply = await user.ctx.post('/api/apply', { data: { job_id: jobId } });
      expect(apply.status()).toBe(200);

      // Owner can read own application via RLS.
      const { data, error } = await restAsUser(user.accessToken)
        .from('applications')
        .select('id');
      expect(error).toBeFalsy();
      expect(data?.length, 'owner should read own application').toBeGreaterThanOrEqual(1);
      const rowId = data![0].id as string;

      const res = await rawRest(user.accessToken, `applications?id=eq.${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'banana' }),
        headers: { Prefer: 'return=minimal' },
      });
      expect(res.status, 'enum CHECK should reject invalid status').toBe(400);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
