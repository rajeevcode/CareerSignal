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
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
