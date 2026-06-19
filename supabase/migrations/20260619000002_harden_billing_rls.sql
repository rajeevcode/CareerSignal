-- Security hardening (QA P0 finding #1): prevent client-side privilege escalation.
--
-- The original policies were `FOR ALL USING (user_id = auth.uid())`, which (with
-- no WITH CHECK) let an authenticated user PATCH their OWN subscriptions/usage
-- row via PostgREST — e.g. set plan='pro' or reset jd_match_count_monthly.
-- Since getUserPlan() trusts subscriptions.plan, that unlocked Pro.
--
-- Fix: users may only READ their own billing/usage rows. All WRITES go through
-- the server (service role / privileged connection), which is RLS-exempt.

DROP POLICY IF EXISTS p_subs_self ON subscriptions;
DROP POLICY IF EXISTS p_usage_self ON usage_limits;
DROP POLICY IF EXISTS p_subs_self_read ON subscriptions;
DROP POLICY IF EXISTS p_usage_self_read ON usage_limits;

CREATE POLICY p_subs_self_read ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY p_usage_self_read ON usage_limits
  FOR SELECT USING (user_id = auth.uid());

-- payments was already SELECT-only (p_payments_self); leave as-is.

-- ---------------------------------------------------------------------------
-- Security hardening (QA P0 finding #2): atomic CV-upload cap for Free users.
--
-- The app-level gate in /api/parse-cv is check-then-write across an async AI
-- call, so concurrent uploads ("two tabs") can all pass the check and exceed the
-- free cap of 3. This BEFORE INSERT trigger enforces the cap inside each insert's
-- own transaction (race-proof, and applies no matter which service inserts).
-- Pro users are unbounded. The app keeps returning a friendly 402 before reaching
-- here; this trigger is the backstop that makes the limit truly atomic.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_cv_upload_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.plan_type;
  v_count integer;
  c_cap constant integer := 3;  -- FREE_LIMITS.cvUploads
BEGIN
  SELECT s.plan INTO v_plan
  FROM public.candidate_profiles cp
  JOIN public.subscriptions s ON s.user_id = cp.user_id
  WHERE cp.id = NEW.candidate_id;

  IF v_plan IS DISTINCT FROM 'pro' THEN
    -- Serialize concurrent inserts for this candidate with a transaction-scoped
    -- advisory lock (FOR UPDATE can't be combined with an aggregate). The lock
    -- is released at COMMIT/ROLLBACK.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.candidate_id::text, 0));

    SELECT count(*) INTO v_count
    FROM public.cv_uploads
    WHERE candidate_id = NEW.candidate_id;

    IF v_count >= c_cap THEN
      RAISE EXCEPTION 'CV upload limit reached (free plan allows % CVs)', c_cap
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv_upload_cap ON cv_uploads;
CREATE TRIGGER trg_cv_upload_cap
  BEFORE INSERT ON cv_uploads
  FOR EACH ROW EXECUTE FUNCTION enforce_cv_upload_cap();
