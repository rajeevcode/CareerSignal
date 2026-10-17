-- ---------------------------------------------------------------------------
-- Harden RLS / authorization for the talent-signal-labs schema (2026-06-23)
--
-- PostgREST exposes every table to the `authenticated` role via table-wide
-- grants, so RLS is the only boundary for direct /rest/v1 access. The original
-- policies in this tree used USING-only clauses (no WITH CHECK) on profiles and
-- granted UPDATE on usage_limits to `authenticated`. That let any signed-in
-- user, with their own JWT:
--   * UPDATE their own profiles row's plan_type / subscription_status to 'pro'
--     / 'active' (free Pro, full paywall bypass), and
--   * reset their own usage_limits counters (jd_match_count_monthly, etc.) to
--     bypass the free monthly quota.
-- This mirrors the apps/web hardening migration (20260622000001). Idempotent.
-- ---------------------------------------------------------------------------

-- 1) profiles: a user may update their own row but NOT the billing columns.
--    Subscription state is written by the trusted backend (service role, which
--    bypasses RLS) only — never directly by the user's JWT.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND plan_type            = (SELECT plan_type            FROM public.profiles WHERE id = auth.uid())
    AND subscription_status  = (SELECT subscription_status  FROM public.profiles WHERE id = auth.uid())
    AND subscription_provider IS NOT DISTINCT FROM (SELECT subscription_provider FROM public.profiles WHERE id = auth.uid())
    AND subscription_customer_id IS NOT DISTINCT FROM (SELECT subscription_customer_id FROM public.profiles WHERE id = auth.uid())
    AND subscription_id      IS NOT DISTINCT FROM (SELECT subscription_id      FROM public.profiles WHERE id = auth.uid())
    AND current_period_end   IS NOT DISTINCT FROM (SELECT current_period_end   FROM public.profiles WHERE id = auth.uid())
  );

-- Defense in depth: drop the table-wide UPDATE grant (which implicitly covers
-- every column, so the policy above is the only guard) and re-grant UPDATE
-- per-column for everything EXCEPT the billing columns. Now even a future
-- permissive policy cannot let `authenticated` write subscription state.
REVOKE UPDATE ON public.profiles FROM authenticated;
DO $$
DECLARE
  cols TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name NOT IN (
      'plan_type', 'subscription_status', 'subscription_provider',
      'subscription_customer_id', 'subscription_id', 'current_period_end'
    );
  EXECUTE format('GRANT UPDATE (%s) ON public.profiles TO authenticated', cols);
END $$;

-- 2) usage_limits: remove the table-wide write grants from `authenticated` so a
--    user can never reset their own quota counters. The counters are maintained
--    by the trusted backend via the service role, which bypasses RLS.
REVOKE INSERT, UPDATE, DELETE ON public.usage_limits FROM authenticated;
DROP POLICY IF EXISTS "Users update own usage"  ON public.usage_limits;
DROP POLICY IF EXISTS "Users insert own usage"  ON public.usage_limits;

-- 3) profiles INSERT: the signup trigger creates the row as service role; a
--    user inserting their own profile must not be able to seed Pro state.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND plan_type = 'free'
    AND subscription_status = 'inactive'
  );
