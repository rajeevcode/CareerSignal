import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { preflight, isAiUp } from '../env';
import { registerUser, guestContext } from '../helpers/register';
import { cleanupUser, seedPrimaryCv } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

test.describe('CV score — POST /api/score-cv (CVS)', () => {
  test('CVS-01 guest → 401 Unauthorized', async () => {
    const ctx = await guestContext();
    try {
      const res = await ctx.post('/api/score-cv', { data: {} });
      expect(res.status()).toBe(401);
      expect((await res.json()).error).toBe('Unauthorized');
    } finally {
      await ctx.dispose();
    }
  });

  test('CVS-02 candidate_id mismatch → 403 Forbidden', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/score-cv', { data: { candidate_id: randomUUID() } });
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('CVS-03 own candidate with primary CV → 200', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    const user = await registerUser();
    try {
      await seedPrimaryCv(user.candidateId);
      const res = await user.ctx.post('/api/score-cv', { data: { candidate_id: user.candidateId } });
      expect(res.status(), 'own CV score should succeed').toBe(200);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
