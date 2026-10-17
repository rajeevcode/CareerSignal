import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Service-role Supabase client. Bypasses RLS — SERVER-ONLY.
 * Use for privileged operations: Storage uploads, admin reads in the session adapter,
 * and writes that must run regardless of the requesting user's RLS scope.
 * NEVER import this into client code.
 */
export function createSupabaseAdminClient() {
  // Server-only client: use the server-reachable Supabase URL. With
  // NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321, 'localhost' resolves to the
  // app container itself (ECONNREFUSED), so every admin read silently fails and
  // callers fall back to defaults (e.g. role -> 'candidate', wrongly denying
  // admins). Prefer SUPABASE_URL (e.g. http://host.docker.internal:54321) when
  // set, matching createSupabaseServerClient and the auth middleware.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return createClient<Database>(
    url,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
