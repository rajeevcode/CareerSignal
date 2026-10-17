import { test, expect } from '@playwright/test';
import { preflight, isAiUp } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, setPlan, seedPrimaryCv } from '../helpers/admin';
import { expectPaywall } from '../helpers/assertions';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Pro-only paywalls — free user → 402 (PAY)', () => {
  // These gates run before any AI call, so no AI is needed to assert the 402.
  const proOnly: Array<{ id: string; path: string; body: unknown; feature: string }> = [
    {
      id: 'PAY-01',
      path: '/api/cover-letter',
      body: { jd_text: 'Senior PM role needing SQL and AI experience to drive growth.' },
      feature: 'cover_letter',
    },
    { id: 'PAY-02', path: '/api/export-cv', body: {}, feature: 'export_cv' },
    { id: 'PAY-03', path: '/api/career-coach', body: { message: 'hi' }, feature: 'career_coach' },
    { id: 'PAY-04', path: '/api/rewrite-bullet', body: { bullet: 'did stuff', mode: 'senior' }, feature: 'cv_rewrite' },
    { id: 'PAY-05', path: '/api/cv-builder', body: { name: 'v2' }, feature: 'create_cv_version' },
  ];

  for (const c of proOnly) {
    test(`${c.id} free POST ${c.path} → 402 ${c.feature}`, async () => {
      const user = await registerUser();
      try {
        const res = await user.ctx.post(c.path, { data: c.body });
        await expectPaywall(res, c.feature);
      } finally {
        await cleanupUser(user.email);
      }
    });
  }

  test('PAY-06 interview — first session free (201), second → 402 interview_prep', async () => {
    const user = await registerUser();
    try {
      const first = await user.ctx.post('/api/interview', { data: { role_title: 'PM' } });
      expect(first.status()).toBe(201);
      expect((await first.json()).session_id).toBeTruthy();

      const second = await user.ctx.post('/api/interview', { data: { role_title: 'PM' } });
      await expectPaywall(second, 'interview_prep');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('PAY-07 interview-prep — first free then second → 402 interview_prep', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    const user = await registerUser();
    try {
      const first = await user.ctx.post('/api/interview-prep', { data: {} });
      expect(first.status(), 'first interview-prep should be allowed').not.toBe(402);

      const second = await user.ctx.post('/api/interview-prep', { data: {} });
      await expectPaywall(second, 'interview_prep');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('PAY-08 ats-check — basic check is free for free users (200)', async () => {
    const user = await registerUser();
    try {
      // Needs a primary CV; otherwise the route 400s before scoring. AI is optional.
      await seedPrimaryCv(user.candidateId);
      const res = await user.ctx.post('/api/ats-check', { data: {} });
      expect(res.status(), 'basic ATS check should be free').toBe(200);
    } finally {
      await cleanupUser(user.email);
    }
  });
});

test.describe('Pro unlocks the paywalled features (PAY)', () => {
  test('PAY-10 pro user is not paywalled on Pro-only features', async () => {
    const user = await registerUser();
    try {
      await setPlan(user.userId, 'pro');

      // Don't assert exact success — some of these forward to AI. Just assert NOT 402.
      const coverLetter = await user.ctx.post('/api/cover-letter', {
        data: { jd_text: 'Senior PM role needing SQL and AI experience to drive growth.' },
      });
      const careerCoach = await user.ctx.post('/api/career-coach', { data: { message: 'hi' } });
      const rewrite = await user.ctx.post('/api/rewrite-bullet', { data: { bullet: 'did stuff', mode: 'senior' } });
      const cvBuilder = await user.ctx.post('/api/cv-builder', { data: { name: 'v2' } });

      expect(coverLetter.status(), 'pro cover-letter').not.toBe(402);
      expect(careerCoach.status(), 'pro career-coach').not.toBe(402);
      expect(rewrite.status(), 'pro rewrite-bullet').not.toBe(402);
      expect(cvBuilder.status(), 'pro cv-builder create').not.toBe(402);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
