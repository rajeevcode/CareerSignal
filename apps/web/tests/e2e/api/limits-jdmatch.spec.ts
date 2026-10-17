import { test, expect } from '@playwright/test';
import { preflight, isAiUp } from '../env';
import { registerUser } from '../helpers/register';
import { cleanupUser, setPlan, setJdUsage, getUsage, currentMonth } from '../helpers/admin';
import { expectPaywall } from '../helpers/assertions';

test.beforeAll(async () => {
  await preflight();
});

const JD_TEXT =
  'We are hiring a Senior Product Manager to own the roadmap for our B2B analytics platform. ' +
  'You will partner with engineering and design, run discovery, define KPIs, and ship features that ' +
  'drive measurable revenue growth. Strong SQL, data fluency, and stakeholder management required.';

function matchBody(jd = JD_TEXT) {
  return { jd_text: jd, job_title: 'Senior PM' };
}

test.describe('JD match limit — free plan = 3/month (LIM-JD)', () => {
  test('LIM-JD-01 three matches succeed and increment usage to 3, 4th → 402', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    test.setTimeout(120_000); // 4 sequential AI matches (~15-20s each)
    const user = await registerUser();
    try {
      for (let i = 1; i <= 3; i++) {
        const res = await user.ctx.post('/api/match-jd', { data: matchBody() });
        expect(res.status(), `match #${i} should succeed`).toBe(200);
      }
      const usage = await getUsage(user.userId);
      expect(usage?.jd_match_count_monthly).toBe(3);

      const fourth = await user.ctx.post('/api/match-jd', { data: matchBody() });
      await expectPaywall(fourth, 'jd_match');
    } finally {
      await cleanupUser(user.email);
    }
  });

  // Server-enforced: gate precedes the AI call, so this 402 needs no AI service.
  test('LIM-JD-02 server-enforced cap — usage at 3 this month → immediate 402', async () => {
    const user = await registerUser();
    try {
      await setJdUsage(user.userId, 3, currentMonth());
      const res = await user.ctx.post('/api/match-jd', { data: matchBody() });
      await expectPaywall(res, 'jd_match');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('LIM-JD-03 monthly reset — stale month counter resets to 1 on next match', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    test.setTimeout(60_000); // one AI match (~15-20s) under parallel load
    const user = await registerUser();
    try {
      // Counter maxed but in a past period → should lazily reset for the current month.
      await setJdUsage(user.userId, 3, '2020-01');
      const res = await user.ctx.post('/api/match-jd', { data: matchBody() });
      expect(res.status(), 'match should succeed after monthly reset').toBe(200);

      const usage = await getUsage(user.userId);
      expect(usage?.jd_match_count_monthly).toBe(1);
      expect(usage?.current_month).toBe(currentMonth());
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('LIM-JD-04 empty JD → 400 and usage is unchanged (no AI call)', async () => {
    const user = await registerUser();
    try {
      const before = await getUsage(user.userId);
      const res = await user.ctx.post('/api/match-jd', { data: { jd_text: '' } });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('Job description required');

      const after = await getUsage(user.userId);
      expect(after?.jd_match_count_monthly).toBe(before?.jd_match_count_monthly ?? 0);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('LIM-JD-05 pro plan ignores the monthly cap', async () => {
    test.skip(!isAiUp(), 'needs AI service');
    test.setTimeout(60_000); // one AI match (~15-20s) under parallel load
    const user = await registerUser();
    try {
      await setPlan(user.userId, 'pro');
      await setJdUsage(user.userId, 99, currentMonth());
      const res = await user.ctx.post('/api/match-jd', { data: matchBody() });
      expect(res.status(), 'pro should not be paywalled on JD match').toBe(200);
    } finally {
      await cleanupUser(user.email);
    }
  });
});
