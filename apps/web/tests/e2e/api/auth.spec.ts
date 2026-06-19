import { test, expect } from '@playwright/test';
import { preflight, TEST_PASSWORD } from '../env';
import { registerUser, uniqueEmail, guestContext } from '../helpers/register';
import { adminClient, cleanupUser, getSubscription, getUsage } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Auth (P0/P1)', () => {
  test('AUTH-01 signup provisions profile + candidate + usage(0) + subscription(free)', async () => {
    const user = await registerUser();
    try {
      const admin = adminClient();
      const { data: profile } = await admin.from('profiles').select('role').eq('id', user.userId).maybeSingle();
      const { data: candidate } = await admin.from('candidate_profiles').select('id').eq('user_id', user.userId).maybeSingle();
      const usage = await getUsage(user.userId);
      const sub = await getSubscription(user.userId);

      expect(profile?.role).toBe('candidate');
      expect(candidate).toBeTruthy();
      expect(usage?.jd_match_count_monthly).toBe(0);
      expect(sub?.plan).toBe('free');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('AUTH-02 duplicate email is blocked', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/auth/register', {
        data: { email: user.email, password: TEST_PASSWORD, fullName: 'Dup' },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toMatch(/already registered/i);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('AUTH-03 login with wrong password → 401', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/auth/login', {
        data: { email: user.email, password: 'WrongPassword!' },
      });
      expect(res.status()).toBe(401);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('AUTH-04 login success → authed cookie can read protected API', async () => {
    const user = await registerUser();
    try {
      const login = await user.ctx.post('/api/auth/login', {
        data: { email: user.email, password: TEST_PASSWORD },
      });
      expect(login.status()).toBe(200);
      const cv = await user.ctx.get('/api/cv-builder');
      expect(cv.status()).toBe(200);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('AUTH-05 logout invalidates the session', async () => {
    const user = await registerUser();
    try {
      const before = await user.ctx.get('/api/cv-builder');
      expect(before.status()).toBe(200);
      const out = await user.ctx.post('/api/auth/logout');
      expect(out.status()).toBe(200);
      const after = await user.ctx.get('/api/cv-builder');
      expect(after.status()).toBe(401);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('AUTH-06 missing fields → 400', async () => {
    const ctx = await guestContext();
    const res = await ctx.post('/api/auth/register', { data: { email: uniqueEmail() } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/missing required fields/i);
    await ctx.dispose();
  });
});
