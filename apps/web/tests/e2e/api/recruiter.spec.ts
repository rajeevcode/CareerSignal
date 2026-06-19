import { test, expect } from '@playwright/test';
import { preflight, TEST_PASSWORD } from '../env';
import { registerUser, guestContext } from '../helpers/register';
import { cleanupUser, setRole, getCompanyId, adminClient } from '../helpers/admin';

test.beforeAll(async () => {
  await preflight();
});

test.describe('Recruiter API — POST /api/recruiter/jobs (REC)', () => {
  // Track recruiter userIds whose created jobs must be cleaned up.
  const createdByUser = new Set<string>();

  test.afterEach(async () => {
    const admin = adminClient();
    for (const uid of createdByUser) {
      await admin.from('jobs').delete().eq('recruiter_id', uid);
    }
    createdByUser.clear();
  });

  test('REC-01 guest → 401 Unauthorized', async () => {
    const ctx = await guestContext();
    try {
      const res = await ctx.post('/api/recruiter/jobs', { data: {} });
      expect(res.status()).toBe(401);
      expect((await res.json()).error).toBe('Unauthorized');
    } finally {
      await ctx.dispose();
    }
  });

  test('REC-02 candidate → 403 Forbidden', async () => {
    const user = await registerUser();
    try {
      const res = await user.ctx.post('/api/recruiter/jobs', { data: {} });
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('REC-03 recruiter happy path creates a job owned by the recruiter', async () => {
    const user = await registerUser();
    try {
      await setRole(user.userId, 'recruiter');
      createdByUser.add(user.userId);
      // Re-login to refresh the session cookie with the new role.
      const login = await user.ctx.post('/api/auth/login', {
        data: { email: user.email, password: TEST_PASSWORD },
      });
      expect(login.status(), 'recruiter re-login should succeed').toBe(200);

      const res = await user.ctx.post('/api/recruiter/jobs', {
        data: { company_id: await getCompanyId(), title: 'QA Role', description: 'desc' },
      });
      expect(res.status(), 'recruiter should create job').toBe(200);
      const { id } = await res.json();
      expect(id, 'created job id returned').toBeTruthy();

      const { data } = await adminClient().from('jobs').select('recruiter_id').eq('id', id).maybeSingle();
      expect(data?.recruiter_id, 'job owned by recruiter').toBe(user.userId);
    } finally {
      await cleanupUser(user.email);
    }
  });

  test('REC-04 admin role is not a recruiter → 403', async () => {
    const user = await registerUser();
    try {
      await setRole(user.userId, 'admin');
      const login = await user.ctx.post('/api/auth/login', {
        data: { email: user.email, password: TEST_PASSWORD },
      });
      expect(login.status()).toBe(200);

      const res = await user.ctx.post('/api/recruiter/jobs', {
        data: { company_id: await getCompanyId(), title: 'QA Role', description: 'desc' },
      });
      expect(res.status(), 'admin must not access recruiter route').toBe(403);
      expect((await res.json()).error).toBe('Forbidden');
    } finally {
      await cleanupUser(user.email);
    }
  });
});
