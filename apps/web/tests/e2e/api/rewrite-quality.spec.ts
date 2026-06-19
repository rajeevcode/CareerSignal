import { test, expect } from '@playwright/test';
import { preflight, isAiUp } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, setPlan, seedPrimaryCv, seededJobIds } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Bullet rewrite quality — POST /api/analyze-gap (RWQ)', () => {
  test('RWQ-01 pro user gap analysis returns well-formed bullet rewrites', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    const user = await registerUser();
    try {
      await setPlan(user.userId, 'pro');
      await seedPrimaryCv(user.candidateId);
      const jobId = (await seededJobIds())[0];
      expect(jobId, 'expected at least one seeded job').toBeTruthy();

      const res = await user.ctx.post('/api/analyze-gap', {
        data: {
          candidate_id: user.candidateId,
          job_id: jobId,
          role_style: 'ai_product_manager',
        },
      });
      expect(res.status(), 'gap analysis should succeed').toBe(200);
      const body = await res.json();

      expect(Array.isArray(body.bullet_rewrites), 'bullet_rewrites should be an array').toBe(true);
      expect(body.bullet_rewrites.length, 'bullet_rewrites should be non-empty').toBeGreaterThan(0);

      for (const item of body.bullet_rewrites) {
        expect(typeof item.before).toBe('string');
        expect(typeof item.issue).toBe('string');
        expect(typeof item.after).toBe('string');
        expect(typeof item.is_placeholder).toBe('boolean');

        const si = item.score_impact;
        expect(si, 'score_impact present').toBeTruthy();
        for (const k of ['jd_match', 'ats', 'recruiter_scan'] as const) {
          expect(Number.isInteger(si[k]), `${k} integer`).toBe(true);
          expect(si[k]).toBeGreaterThanOrEqual(0);
          expect(si[k]).toBeLessThanOrEqual(15);
        }

        // A rewrite containing an unresolved placeholder token must be flagged.
        if (item.after.includes('[')) {
          expect(item.is_placeholder, 'bracketed rewrite must be flagged placeholder').toBe(true);
        }

        // Rewrites should read like resume bullets: start with a capitalized action verb (tolerant).
        expect(item.after, `after should start with a capitalized verb: "${item.after}"`).toMatch(
          /^[A-Z][a-z]+/,
        );
      }
    } finally {
      await cleanupUser(user.email);
    }
  });
});
