-- Candidate workflow: source snapshots, append-only history, capture, contacts,
-- consent-bound connections, durable reminders and AI request reservations.
CREATE SCHEMA IF NOT EXISTS career_private;
REVOKE ALL ON SCHEMA career_private FROM PUBLIC;

ALTER TABLE public.companies ADD COLUMN captured_by uuid REFERENCES public.candidate_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD COLUMN captured_by uuid REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT private_captures_stay_draft CHECK(captured_by IS NULL OR status='draft');
DROP POLICY p_companies_read ON public.companies;
CREATE POLICY p_companies_read ON public.companies FOR SELECT USING (captured_by IS NULL OR captured_by IN (SELECT id FROM public.candidate_profiles WHERE user_id=auth.uid()) OR public.is_admin());
DROP POLICY p_jobs_read ON public.jobs;
CREATE POLICY p_jobs_read ON public.jobs FOR SELECT USING ((captured_by IS NULL AND status='published') OR captured_by IN (SELECT id FROM public.candidate_profiles WHERE user_id=auth.uid()) OR public.is_admin());
ALTER TABLE public.match_scores ADD COLUMN scoring_version text;
CREATE TABLE public.captured_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  canonical_url text NOT NULL, country text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, canonical_url)
);
CREATE TABLE public.application_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_json jsonb NOT NULL, cv_json jsonb, cv_fingerprint text, country text, source_host text,
  provenance text NOT NULL CHECK(provenance IN ('submission','existing_record')),
  scoring_version text NOT NULL DEFAULT 'unknown', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  from_status text, to_status text NOT NULL, kind text NOT NULL CHECK(kind IN ('created','transition','baseline')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_events_owner_time ON public.application_events(candidate_id, application_id, created_at);
CREATE TABLE public.career_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  name text NOT NULL, email text, company text, notes text, next_contact_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.star_stories ADD COLUMN source_excerpt text, ADD COLUMN source_cv_id uuid,
  ADD COLUMN candidate_verified_at timestamptz;
CREATE TABLE public.career_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('inbox','calendar')), token_ciphertext text NOT NULL,
  scopes text NOT NULL, last_synced_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id,kind)
);
CREATE TABLE public.career_oauth_states (
  state_hash text PRIMARY KEY, candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('inbox','calendar')), verifier_ciphertext text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE public.career_integration_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.career_connections(id) ON DELETE CASCADE,
  external_id text NOT NULL, kind text NOT NULL, title text NOT NULL, excerpt text, source_url text,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  all_day boolean NOT NULL DEFAULT false,
  starts_at timestamptz, proposed_status text, reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id,external_id)
);
CREATE TABLE public.career_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(application_id,due_at)
);
CREATE TABLE public.jd_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, request_key text NOT NULL, body_hash text NOT NULL,
  status text NOT NULL CHECK(status IN ('processing','succeeded','failed')), reserved_month text,
  response_json jsonb, lease_expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,request_key)
);
CREATE INDEX jd_requests_expiry ON public.jd_requests(lease_expires_at) WHERE status='processing';
CREATE INDEX career_items_owner ON public.career_integration_items(candidate_id,created_at);
CREATE INDEX career_contacts_owner ON public.career_contacts(candidate_id);
CREATE INDEX career_connections_owner ON public.career_connections(candidate_id);
CREATE INDEX career_oauth_expiry ON public.career_oauth_states(expires_at);
CREATE INDEX career_notifications_owner ON public.career_notifications(candidate_id,due_at);
CREATE INDEX captured_companies_owner ON public.companies(captured_by) WHERE captured_by IS NOT NULL;
CREATE INDEX captured_job_owner ON public.jobs(captured_by) WHERE captured_by IS NOT NULL;
CREATE INDEX captured_jobs_job ON public.captured_jobs(job_id);
CREATE INDEX application_snapshots_owner ON public.application_snapshots(candidate_id);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['captured_jobs','application_snapshots','application_events','career_contacts','career_connections','career_oauth_states','career_integration_items','career_notifications','jd_requests'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    -- Credentials, OAuth states and request caches are server-only, even when encrypted.
    IF t NOT IN ('career_connections','career_oauth_states','jd_requests') THEN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
      EXECUTE format('CREATE POLICY owner_read ON public.%I FOR SELECT TO authenticated USING (candidate_id IN (SELECT id FROM public.candidate_profiles WHERE user_id = (SELECT auth.uid())))', t);
    END IF;
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;

CREATE FUNCTION career_private.reject_snapshot_update() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Submission snapshots are immutable'; END $$;
CREATE TRIGGER immutable_submission BEFORE UPDATE ON public.application_snapshots FOR EACH ROW EXECUTE FUNCTION career_private.reject_snapshot_update();
CREATE FUNCTION career_private.reject_event_update() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Application history is append-only'; END $$;
CREATE TRIGGER immutable_history BEFORE UPDATE ON public.application_events FOR EACH ROW EXECUTE FUNCTION career_private.reject_event_update();

CREATE FUNCTION career_private.guard_application_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.candidate_profiles WHERE id=NEW.candidate_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Application owner mismatch';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.candidate_id IS DISTINCT FROM OLD.candidate_id OR NEW.job_id IS DISTINCT FROM OLD.job_id THEN
      RAISE EXCEPTION 'Application identity is immutable';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.jobs WHERE id=NEW.job_id AND ((captured_by IS NULL AND status='published') OR captured_by=NEW.candidate_id)) THEN
    RAISE EXCEPTION 'Job is unavailable to this candidate';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER application_identity BEFORE INSERT OR UPDATE OF candidate_id,job_id ON public.applications FOR EACH ROW EXECUTE FUNCTION career_private.guard_application_identity();

CREATE FUNCTION career_private.record_application() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job_data jsonb; cv_data jsonb; country_value text; source text; version_value text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.candidate_profiles WHERE id=NEW.candidate_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Application owner mismatch';
  END IF;
  IF TG_OP='INSERT' THEN
    INSERT INTO public.application_events(application_id,candidate_id,to_status,kind) VALUES(NEW.id,NEW.candidate_id,NEW.status,'created');
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.application_events(application_id,candidate_id,from_status,to_status,kind) VALUES(NEW.id,NEW.candidate_id,OLD.status,NEW.status,'transition');
  END IF;
  IF NEW.status <> 'saved' AND NOT EXISTS (SELECT 1 FROM public.application_snapshots WHERE application_id=NEW.id) THEN
    SELECT jsonb_build_object('id',j.id,'title',j.title,'description',j.description,'location',j.location,'company',c.name,'source_url',j.source_url),j.source_url
      INTO job_data,source FROM public.jobs j JOIN public.companies c ON c.id=j.company_id WHERE j.id=NEW.job_id;
    SELECT jsonb_build_object('kind','builder','id',v.id,'name',v.name,'content',v.content_json) INTO cv_data
      FROM public.cv_versions v WHERE v.id=NEW.cv_version_id AND v.candidate_id=NEW.candidate_id;
    IF cv_data IS NULL THEN
      SELECT jsonb_build_object('kind','upload','id',v.id,'name',v.file_name,'text',v.parsed_text) INTO cv_data
        FROM public.cv_uploads v WHERE v.id=NEW.cv_version_id AND v.candidate_id=NEW.candidate_id;
    END IF;
    SELECT country INTO country_value FROM public.captured_jobs WHERE job_id=NEW.job_id AND candidate_id=NEW.candidate_id;
    SELECT scoring_version INTO version_value FROM public.match_scores WHERE candidate_id=NEW.candidate_id AND job_id=NEW.job_id;
    INSERT INTO public.application_snapshots(application_id,candidate_id,job_json,cv_json,cv_fingerprint,country,source_host,provenance,scoring_version)
      VALUES(NEW.id,NEW.candidate_id,job_data,cv_data,
        CASE WHEN cv_data IS NOT NULL THEN encode(sha256(convert_to((cv_data - 'id' - 'name')::text,'UTF8')),'hex') END,
        country_value, substring(source FROM '^https?://([^/:]+)'), 'submission',coalesce(version_value,'unknown'));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA career_private FROM PUBLIC,anon,authenticated;
CREATE TRIGGER application_record AFTER INSERT OR UPDATE OF status ON public.applications FOR EACH ROW EXECUTE FUNCTION career_private.record_application();
-- Existing applications have no trustworthy historical submission snapshot. Log an honest baseline only.
INSERT INTO public.application_events(application_id,candidate_id,to_status,kind)
SELECT id,candidate_id,status,'baseline' FROM public.applications;

CREATE FUNCTION public.run_career_maintenance(target_candidate uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE reminder_count integer; expired_count integer;
BEGIN
  INSERT INTO public.career_notifications(candidate_id,application_id,due_at)
    SELECT candidate_id,id,follow_up_due_at FROM public.applications
    WHERE (target_candidate IS NULL OR candidate_id=target_candidate) AND follow_up_due_at <= now() AND status IN ('applied','viewed','recruiter_viewed','shortlisted','follow_up_needed')
    ON CONFLICT(application_id,due_at) DO NOTHING;
  GET DIAGNOSTICS reminder_count=ROW_COUNT;
  WITH expired AS (
    UPDATE public.jd_requests SET status='failed'
      WHERE id IN (SELECT id FROM public.jd_requests WHERE (target_candidate IS NULL OR candidate_id=target_candidate) AND status='processing' AND lease_expires_at < now() FOR UPDATE SKIP LOCKED)
      RETURNING user_id,reserved_month
  ), refunds AS (SELECT user_id,reserved_month,count(*) AS amount FROM expired WHERE reserved_month IS NOT NULL GROUP BY user_id,reserved_month)
  UPDATE public.usage_limits u SET jd_match_count_monthly=greatest(0,u.jd_match_count_monthly-r.amount::integer),updated_at=now()
    FROM refunds r WHERE u.user_id=r.user_id AND u.current_month=r.reserved_month;
  GET DIAGNOSTICS expired_count=ROW_COUNT;
  DELETE FROM public.career_oauth_states WHERE expires_at < now() AND (target_candidate IS NULL OR candidate_id=target_candidate);
  RETURN jsonb_build_object('reminders_created',reminder_count,'quota_accounts_reconciled',expired_count);
END $$;
REVOKE ALL ON FUNCTION public.run_career_maintenance(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.run_career_maintenance(uuid) TO service_role;
