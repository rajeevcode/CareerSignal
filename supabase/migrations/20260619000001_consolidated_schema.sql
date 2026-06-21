-- CareerSignal consolidated schema (SQLite -> Supabase Postgres migration)
-- Identity via auth.users + profiles. Counters in usage_limits. Billing in subscriptions/payments.
-- Timestamps are timestamptz; the app reads them as ISO strings (Drizzle mode:'string').

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
-- Idempotent enum creation: tolerate a pre-existing type so `supabase start`
-- can replay this migration on a partially-initialized database without aborting.
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('candidate', 'recruiter', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('inactive', 'active', 'cancelled', 'past_due', 'trialing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE remote_type AS ENUM ('remote', 'hybrid', 'onsite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE remote_preference AS ENUM ('remote', 'hybrid', 'onsite', 'any');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM ('full_time', 'contract', 'internship', 'part_time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('draft', 'published', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE skill_source AS ENUM ('cv', 'manual', 'linkedin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE scam_risk AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE jd_clarity AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE coach_role AS ENUM ('user', 'assistant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE interview_mode AS ENUM ('behavioral', 'technical', 'company');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE interview_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE job_report_status AS ENUM ('open', 'reviewed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM (
    'saved', 'applied', 'viewed', 'recruiter_viewed', 'shortlisted', 'hr_screen',
    'technical_round', 'case_study', 'final_round', 'interview', 'offer',
    'rejected', 'ghosted', 'follow_up_needed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Identity, billing & usage
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role user_role NOT NULL DEFAULT 'candidate',
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_upload_count INT NOT NULL DEFAULT 0,
  jd_match_count_monthly INT NOT NULL DEFAULT 0,
  saved_jobs_count INT NOT NULL DEFAULT 0,
  tracked_applications_count INT NOT NULL DEFAULT 0,
  current_month TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan plan_type NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'inactive',
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT,
  provider_payment_id TEXT,
  amount INT,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT,
  entity_id UUID,
  flag_type TEXT,
  severity TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Candidate domain
-- ---------------------------------------------------------------------------
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_title TEXT,
  location TEXT,
  total_experience_years DOUBLE PRECISION,
  salary_expectation DOUBLE PRECISION,
  salary_currency TEXT NOT NULL DEFAULT 'INR',
  notice_period TEXT,
  visa_status TEXT,
  remote_preference remote_preference NOT NULL DEFAULT 'any',
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  target_markets TEXT[] NOT NULL DEFAULT '{}',
  career_outcome TEXT,
  career_goal TEXT,
  relocation_preference TEXT,
  profile_summary TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  cv_score DOUBLE PRECISION,
  cv_score_breakdown JSONB,
  cv_feedback_json JSONB,
  embedding vector(1536),
  onboarding_step INT NOT NULL DEFAULT 0,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  location TEXT,
  description TEXT,
  achievements TEXT[] NOT NULL DEFAULT '{}',
  skills_used TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_level skill_level,
  years_experience DOUBLE PRECISION,
  source skill_source NOT NULL DEFAULT 'cv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, skill_name)
);

CREATE TABLE cv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  parsed_json JSONB,
  parsed_text TEXT,
  ats_score DOUBLE PRECISION,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Companies & jobs
-- ---------------------------------------------------------------------------
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  size TEXT,
  location TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  trust_score DOUBLE PRECISION,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  remote_type remote_type NOT NULL DEFAULT 'onsite',
  salary_min DOUBLE PRECISION,
  salary_max DOUBLE PRECISION,
  salary_currency TEXT NOT NULL DEFAULT 'INR',
  experience_min INT,
  experience_max INT,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  nice_to_have_skills TEXT[] NOT NULL DEFAULT '{}',
  employment_type employment_type NOT NULL DEFAULT 'full_time',
  visa_sponsorship BOOLEAN NOT NULL DEFAULT FALSE,
  function_tag TEXT,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  status job_status NOT NULL DEFAULT 'draft',
  source_url TEXT,
  external_id TEXT,
  applicant_count INT NOT NULL DEFAULT 0,
  salary_disclosed BOOLEAN NOT NULL DEFAULT TRUE,
  scam_risk scam_risk DEFAULT 'low',
  jd_clarity jd_clarity DEFAULT 'medium',
  recruiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  embedding vector(1536),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, job_id)
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'applied',
  cv_version_id UUID,
  match_score DOUBLE PRECISION,
  interview_probability DOUBLE PRECISION,
  follow_up_due_at TIMESTAMPTZ,
  next_action TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, job_id)
);

CREATE TABLE match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  experience_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  role_similarity_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  domain_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  seniority_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  location_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  cv_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  competition_score DOUBLE PRECISION NOT NULL DEFAULT 50,
  freshness_score DOUBLE PRECISION NOT NULL DEFAULT 50,
  final_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  jd_match_score DOUBLE PRECISION,
  interview_signal DOUBLE PRECISION,
  explanation_json JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, job_id)
);

-- ---------------------------------------------------------------------------
-- AI feature tables
-- ---------------------------------------------------------------------------
CREATE TABLE jd_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  jd_text TEXT NOT NULL,
  job_title TEXT,
  jd_match_score DOUBLE PRECISION,
  interview_signal DOUBLE PRECISION,
  breakdown_json JSONB,
  gap_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cv_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}',
  target_role TEXT,
  target_market TEXT,
  cv_score DOUBLE PRECISION,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_prep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  readiness_score DOUBLE PRECISION,
  questions_json JSONB,
  company_summary TEXT,
  plan_30_90 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE star_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  situation TEXT,
  task TEXT,
  action TEXT,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  role coach_role NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  cv_version_id UUID REFERENCES cv_versions(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  tone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  role_title TEXT NOT NULL,
  company_name TEXT,
  mode interview_mode NOT NULL DEFAULT 'behavioral',
  difficulty interview_difficulty NOT NULL DEFAULT 'medium',
  overall_score DOUBLE PRECISION,
  summary TEXT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  turn_index INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  feedback_json JSONB,
  score DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reporter_id UUID,
  reason TEXT NOT NULL,
  status job_report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recruiter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_required_skills ON jobs USING GIN(required_skills);
CREATE INDEX idx_jobs_tech_stack ON jobs USING GIN(tech_stack);
CREATE INDEX idx_jobs_search ON jobs USING GIN(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_match_scores_candidate ON match_scores(candidate_id, final_score DESC);
CREATE INDEX idx_match_scores_job ON match_scores(job_id, final_score DESC);
CREATE INDEX idx_applications_candidate ON applications(candidate_id, applied_at DESC);
CREATE INDEX idx_coach_messages_candidate ON coach_messages(candidate_id, created_at);
CREATE INDEX idx_interview_messages_session ON interview_messages(session_id, turn_index);
CREATE INDEX idx_candidate_profiles_embedding ON candidate_profiles USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER usage_limits_updated_at BEFORE UPDATE ON usage_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cv_versions_updated_at BEFORE UPDATE ON cv_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cover_letters_updated_at BEFORE UPDATE ON cover_letters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER interview_sessions_updated_at BEFORE UPDATE ON interview_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- Auth signup trigger: create profile + candidate_profile + usage_limits + subscription
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER runs with the auth schema's search_path, so every table is
-- explicitly schema-qualified and search_path is pinned to public.
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
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'candidate')
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION get_candidate_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE jd_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_prep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_reports ENABLE ROW LEVEL SECURITY;

-- Identity & billing (user_id = auth.uid())
CREATE POLICY p_profiles_self ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY p_profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY p_usage_self ON usage_limits FOR ALL USING (user_id = auth.uid());
CREATE POLICY p_subs_self ON subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY p_payments_self ON payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY p_admin_flags_admin ON admin_flags FOR ALL USING (is_admin());

-- candidate_id-owned helper pattern via subquery
CREATE POLICY p_candidate_self ON candidate_profiles FOR ALL USING (user_id = auth.uid() OR is_admin());
CREATE POLICY p_experience_self ON candidate_experience FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_skills_self ON candidate_skills FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_cv_uploads_self ON cv_uploads FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_saved_jobs_self ON saved_jobs FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_applications_self ON applications FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_match_scores_self ON match_scores FOR SELECT USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_jd_analyses_self ON jd_analyses FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_cv_versions_self ON cv_versions FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_prep_self ON interview_prep_sessions FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_star_self ON star_stories FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_coach_self ON coach_messages FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_cover_self ON cover_letters FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_isessions_self ON interview_sessions FOR ALL USING (candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid()));
CREATE POLICY p_imessages_self ON interview_messages FOR ALL USING (session_id IN (SELECT s.id FROM interview_sessions s JOIN candidate_profiles c ON s.candidate_id = c.id WHERE c.user_id = auth.uid()));
CREATE POLICY p_recruiter_self ON recruiter_profiles FOR ALL USING (user_id = auth.uid() OR is_admin());

-- Companies & jobs: public read; admin manage
CREATE POLICY p_companies_read ON companies FOR SELECT USING (true);
CREATE POLICY p_companies_admin ON companies FOR ALL USING (is_admin());
CREATE POLICY p_jobs_read ON jobs FOR SELECT USING (status = 'published' OR is_admin());
CREATE POLICY p_jobs_admin ON jobs FOR ALL USING (is_admin());

-- Job reports: admins read/manage; anyone authenticated can file
CREATE POLICY p_job_reports_admin ON job_reports FOR ALL USING (is_admin());
CREATE POLICY p_job_reports_insert ON job_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Storage: private cv-uploads bucket + per-user-folder policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-uploads', 'cv-uploads', false, 52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY p_cv_storage_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY p_cv_storage_select ON storage.objects FOR SELECT
  USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY p_cv_storage_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------------
-- Role grants for PostgREST roles. service_role bypasses RLS and needs full
-- table privileges (used by seed scripts and server-side admin client).
-- authenticated/anon are gated by the RLS policies above.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
