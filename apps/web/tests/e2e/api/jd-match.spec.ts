import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { preflight, isAiUp } from '../env';
import { registerUser, guestContext } from '../helpers/register';
import { cleanupUser } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

const JD_TEXT =
  'We are hiring a Senior Product Manager to own the roadmap for our B2B analytics platform. ' +
  'You will partner with engineering and design, run discovery, and ship features that drive revenue.';

test.describe('JD match — POST /api/match-jd (JDM)', () => {
  test('JDM-01 guest → 401 Unauthorized', async () => {
    const ctx = await guestContext();
    try {
      const res = await ctx.post('/api/match-jd', { data: { jd_text: JD_TEXT } });
      expect(res.status()).toBe(401);
      expect((await res.json()).error).toBe('Unauthorized');
    } finally {
      await ctx.dispose();
    }
  });

  test('JDM-02 candidate_id mismatch → 403 Forbidden', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/match-jd', {
        data: { candidate_id: randomUUID(), jd_text: 'x'.repeat(60) },
      });
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('JDM-03 empty jd_text → 400 (no AI needed)', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/match-jd', { data: { jd_text: '' } });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('Job description required');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('JDM-04 valid JD for own candidate → 200', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/match-jd', {
        data: { candidate_id: user.candidateId, jd_text: JD_TEXT, job_title: 'Senior PM' },
      });
      expect(res.status(), 'valid JD match should succeed').toBe(200);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
