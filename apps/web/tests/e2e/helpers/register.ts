import { createClient } from '@supabase/supabase-js';
import type { APIRequestContext } from '@playwright/test';
import { request as pwRequest } from '@playwright/test';
import { BASE_URL, SUPA_URL, ANON_KEY, TEST_PREFIX, TEST_PASSWORD } from '../env';
import { getCandidateId } from './admin';

let counter = 0;
export function uniqueEmail(): string {
  counter += 1;
  return `${TEST_PREFIX}${Date.now()}_${counter}_${Math.floor(Math.random() * 1e6)}@careersignal.test`;
}

export interface TestUser {
  ctx: APIRequestContext; // cookie-bound authed Playwright request context
  email: string;
  userId: string;
  candidateId: string;
  accessToken: string; // user JWT for RLS tests
}

/**
 * Register a fresh user via the real signup API (sets sb-* cookies on `ctx`),
 * and obtain the user JWT + ids via a direct anon-client sign-in.
 */
export async function registerUser(opts?: { fullName?: string }): Promise<TestUser> {
  const email = uniqueEmail();
  const ctx = await pwRequest.newContext({ baseURL: BASE_URL });

  const res = await ctx.post('/api/auth/register', {
    data: { email, password: TEST_PASSWORD, fullName: opts?.fullName ?? 'QA User' },
  });
  if (res.status() !== 200) {
    throw new Error(`register failed (${res.status()}): ${await res.text()}`);
  }

  const anon = createClient(SUPA_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error || !data.session) throw new Error(`sign-in for token failed: ${error?.message}`);

  const userId = data.user.id;
  const candidateId = await getCandidateId(userId);
  return { ctx, email, userId, candidateId, accessToken: data.session.access_token };
}

/** A guest (no cookies) request context. */
export async function guestContext(): Promise<APIRequestContext> {
  return pwRequest.newContext({ baseURL: BASE_URL });
}
