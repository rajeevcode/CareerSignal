import { test, expect } from '@playwright/test';
import { preflight, isAiUp } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, setPlan, countRows } from '../helpers/admin';
import { expectPaywall } from '../helpers/assertions';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Interview & career coach (ICO)', () => {
  test('ICO-01 free interview preview → 201, then 2nd → 402 interview_prep', async () => {
    test.skip(!isAiUp(), 'needs AI service (interview/start)');
    const user = await registerUser();
    try {
      const first = await user.ctx.post('/api/interview', { data: { role_title: 'PM' } });
      expect(first.status(), 'first free interview preview should succeed').toBe(201);
      expect((await first.json()).session_id, 'session_id returned').toBeTruthy();

      // Writes 1 session + 1 opening message.
      expect(await countRows('interview_sessions', user.candidateId)).toBe(1);

      const second = await user.ctx.post('/api/interview', { data: { role_title: 'PM' } });
      await expectPaywall(second, 'interview_prep');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('ICO-02 career-coach GET → 200 with empty history', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.get('/api/career-coach');
      expect(res.status()).toBe(200);
      expect((await res.json()).messages).toEqual([]);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('ICO-03 career-coach POST free → 402 career_coach', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/career-coach', { data: { message: 'hi' } });
      await expectPaywall(res, 'career_coach');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('ICO-04 career-coach POST pro → 200', async () => {
    test.skip(!isAiUp(), 'needs AI service (coach/chat)');
    const user = await registerUser();
    try {
      await setPlan(user.userId, 'pro');
      const res = await user.ctx.post('/api/career-coach', { data: { message: 'hi' } });
      expect(res.status(), 'pro career coach should succeed').toBe(200);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
