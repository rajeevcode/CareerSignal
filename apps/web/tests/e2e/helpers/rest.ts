import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPA_URL, ANON_KEY } from '../env';

/**
 * Supabase client scoped to a specific USER's JWT. RLS applies as that user
 * (auth.uid() resolves). This is the ONLY correct way to test RLS — the Next
 * API uses a privileged connection and would bypass it.
 */
export function restAsUser(accessToken: string): SupabaseClient {
  return createClient(SUPA_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Raw PostgREST fetch as a user (to assert exact HTTP status of writes). */
export async function rawRest(
  accessToken: string | null,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${SUPA_URL}/rest/v1/${path}`, { ...init, headers });
}
