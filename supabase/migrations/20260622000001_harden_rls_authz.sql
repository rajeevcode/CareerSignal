-- ---------------------------------------------------------------------------
-- Harden RLS / authorization (2026-06-22)
--
-- Closes privilege-escalation and ownership-reassignment holes left by the
-- consolidated schema. PostgREST exposes every table to the `authenticated`
-- role (it holds table-wide INSERT/UPDATE/DELETE grants), so RLS is the only
-- boundary for direct /rest/v1 access. The original FOR ALL / FOR UPDATE
-- policies had a USING clause but no WITH CHECK, which only filters which
-- *existing* rows are visible — it does NOT constrain the row's new values.
-- That let an authenticated user:
--   * UPDATE profiles.role to 'admin' (full platform takeover), and
--   * INSERT/UPDATE owned rows with a candidate_id/user_id pointing at a victim.
-- Each policy below is replaced with an explicit WITH CHECK that binds the
-- post-image to the caller. Idempotent: DROP ... IF EXISTS then CREATE.
-- ---------------------------------------------------------------------------

-- 1) profiles: a user may update their own row but NOT change their role.
--    (role changes go through the service role only.)
DROP POLICY IF EXISTS p_profiles_update ON profiles;
CREATE POLICY p_profiles_update ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );
-- Defense in depth: even with a permissive policy, deny direct role writes.
REVOKE UPDATE (role) ON profiles FROM authenticated;

-- 2) candidate_profiles: bind user_id to the caller on every write.
--    (Score/embedding/onboarding columns are written by the trusted backend,
--    which uses the service role and bypasses RLS — so this only restricts the
--    user's own direct writes, it does not block server-computed updates.)
DROP POLICY IF EXISTS p_candidate_self ON candidate_profiles;
CREATE POLICY p_candidate_self ON candidate_profiles FOR ALL
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS p_recruiter_self ON recruiter_profiles;
CREATE POLICY p_recruiter_self ON recruiter_profiles FOR ALL
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- 3) candidate_id-owned tables: add WITH CHECK mirroring the ownership subquery
--    so a user cannot INSERT/repoint a row toward another candidate.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('p_experience_self', 'candidate_experience'),
      ('p_skills_self',     'candidate_skills'),
      ('p_cv_uploads_self', 'cv_uploads'),
      ('p_saved_jobs_self', 'saved_jobs'),
      ('p_applications_self','applications'),
      ('p_jd_analyses_self','jd_analyses'),
      ('p_cv_versions_self','cv_versions'),
      ('p_prep_self',       'interview_prep_sessions'),
      ('p_star_self',       'star_stories'),
      ('p_coach_self',      'coach_messages'),
      ('p_cover_self',      'cover_letters'),
      ('p_isessions_self',  'interview_sessions')
    ) AS t(policy_name, tbl)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policy_name, r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL '
      'USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())) '
      'WITH CHECK (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()))',
      r.policy_name, r.tbl
    );
  END LOOP;
END $$;

-- interview_messages is owned via the parent session join.
DROP POLICY IF EXISTS p_imessages_self ON interview_messages;
CREATE POLICY p_imessages_self ON interview_messages FOR ALL
  USING (session_id IN (
    SELECT s.id FROM interview_sessions s
    JOIN candidate_profiles c ON s.candidate_id = c.id
    WHERE c.user_id = auth.uid()))
  WITH CHECK (session_id IN (
    SELECT s.id FROM interview_sessions s
    JOIN candidate_profiles c ON s.candidate_id = c.id
    WHERE c.user_id = auth.uid()));

-- 4) job_reports: the reporter cannot be spoofed.
DROP POLICY IF EXISTS p_job_reports_insert ON job_reports;
CREATE POLICY p_job_reports_insert ON job_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

-- 5) Billing tables: SELECT-only for users (already enforced by policy in
--    harden_billing_rls). Remove the table-wide write grants so a stray future
--    policy can never reopen self-upgrade to Pro / payment forgery.
REVOKE INSERT, UPDATE, DELETE ON subscriptions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON usage_limits  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON payments      FROM authenticated;

-- 6) Signup trigger: never honor a client-supplied role. A user can set
--    arbitrary user_metadata at signUp, so reading role from it was a second
--    door to admin self-grant. Always create candidates; elevate via the
--    service role only.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'candidate'
  );

  INSERT INTO public.candidate_profiles (user_id)
  VALUES (NEW.id);

  INSERT INTO public.usage_limits (user_id, current_month)
  VALUES (NEW.id, to_char(NOW(), 'YYYY-MM'));

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'inactive');

  RETURN NEW;
END;
$$;
