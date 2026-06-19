import { test, expect } from '@playwright/test';
import { preflight } from '../env';
import { registerUser } from '../helpers/register';
import { restAsUser, rawRest } from '../helpers/rest';
import { adminClient, cleanupUser, seedPrimaryCv, seededJobIds } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

/**
 * RLS cross-user isolation. MUST use a user's JWT against /rest/v1 — the Next
 * API uses a privileged connection and would bypass RLS entirely.
 */
test.describe('Security: RLS cross-user isolation (P0)', () => {
  test('RLS-01..06 userB cannot read userA private rows; A sees own', async () => {
    const a = await registerUser();
    const b = await registerUser();
    try {
      const admin = adminClient();
      const now = new Date().toISOString();
      const [jobId] = await seededJobIds(1);

      // Seed A's private data (service role bypasses RLS).
      await seedPrimaryCv(a.candidateId);
      await admin.from('saved_jobs').insert({ candidate_id: a.candidateId, job_id: jobId, created_at: now });
      await admin.from('applications').insert({ candidate_id: a.candidateId, job_id: jobId, status: 'applied', applied_at: now, updated_at: now });

      const asB = restAsUser(b.accessToken);

      const cv = await asB.from('cv_uploads').select('id').eq('candidate_id', a.candidateId);
      expect(cv.data ?? []).toHaveLength(0);

      const apps = await asB.from('applications').select('id').eq('candidate_id', a.candidateId);
      expect(apps.data ?? []).toHaveLength(0);

      const saved = await asB.from('saved_jobs').select('id').eq('candidate_id', a.candidateId);
      expect(saved.data ?? []).toHaveLength(0);

      const cand = await asB.from('candidate_profiles').select('id').eq('id', a.candidateId);
      expect(cand.data ?? []).toHaveLength(0);

      const subs = await asB.from('subscriptions').select('id').eq('user_id', a.userId);
      expect(subs.data ?? []).toHaveLength(0);

      const usage = await asB.from('usage_limits').select('id').eq('user_id', a.userId);
      expect(usage.data ?? []).toHaveLength(0);

      // Positive control: A sees A's own CV.
      const asA = restAsUser(a.accessToken);
      const ownCv = await asA.from('cv_uploads').select('id').eq('candidate_id', a.candidateId);
      expect((ownCv.data ?? []).length).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupUser(a.email);
      await cleanupUser(b.email);
    }
  });

  test('RLS-08 anon (no JWT) cannot read applications', async () => {
    const res = await rawRest(null, 'applications?select=id');
    // PostgREST with anon key + RLS: 200 with empty array, or 401.
    if (res.status === 200) {
      expect(await res.json()).toHaveLength(0);
    } else {
      expect([401, 400]).toContain(res.status);
    }
  });
});
