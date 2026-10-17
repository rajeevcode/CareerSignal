
-- Companies
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  website text,
  description text,
  industry text,
  size text,
  hq_location text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are public readable" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Admins manage companies" ON public.companies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Jobs
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  location text,
  remote_policy text,
  employment_type text,
  seniority text,
  salary_min int,
  salary_max int,
  salary_currency text DEFAULT 'USD',
  visa_sponsorship boolean DEFAULT false,
  skills text[] DEFAULT '{}',
  source text DEFAULT 'manual',
  external_url text,
  posted_at timestamptz DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active jobs are public" ON public.jobs FOR SELECT USING (active = true);
CREATE POLICY "Recruiters insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'recruiter') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Recruiters update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Recruiters delete own jobs" ON public.jobs FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- CVs
CREATE TABLE public.cvs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My CV',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cvs TO authenticated;
GRANT ALL ON public.cvs TO service_role;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cvs" ON public.cvs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- CV Versions (file + parsed data snapshot)
CREATE TABLE public.cv_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id uuid NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number int NOT NULL DEFAULT 1,
  storage_path text,
  file_name text,
  raw_text text,
  parsed jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_versions TO authenticated;
GRANT ALL ON public.cv_versions TO service_role;
ALTER TABLE public.cv_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cv versions" ON public.cv_versions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- CV Scores
CREATE TABLE public.cv_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_version_id uuid NOT NULL REFERENCES public.cv_versions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall int NOT NULL,
  sub_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_scores TO authenticated;
GRANT ALL ON public.cv_scores TO service_role;
ALTER TABLE public.cv_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own scores" ON public.cv_scores FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Target Roles
CREATE TABLE public.target_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  seniority text,
  is_primary boolean NOT NULL DEFAULT false,
  fit_score int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.target_roles TO authenticated;
GRANT ALL ON public.target_roles TO service_role;
ALTER TABLE public.target_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own target roles" ON public.target_roles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Candidate preferences
CREATE TABLE public.candidate_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goal text,
  markets text[] DEFAULT '{}',
  work_modes text[] DEFAULT '{}',
  min_salary int,
  salary_currency text DEFAULT 'USD',
  needs_visa boolean DEFAULT false,
  notice_period text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_preferences TO authenticated;
GRANT ALL ON public.candidate_preferences TO service_role;
ALTER TABLE public.candidate_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON public.candidate_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Applications
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  cv_version_id uuid REFERENCES public.cv_versions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'saved',
  match_score int,
  notes text,
  applied_at timestamptz,
  next_action_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own applications" ON public.applications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Saved jobs
CREATE TABLE public.saved_jobs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved jobs" ON public.saved_jobs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Updated_at triggers
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cvs_updated BEFORE UPDATE ON public.cvs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.candidate_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_apps_updated BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed demo companies + jobs
INSERT INTO public.companies (name, slug, industry, size, hq_location, verified, description) VALUES
  ('BerlinTech AI', 'berlintech-ai', 'AI / SaaS', '50-200', 'Berlin, Germany', true, 'Applied AI platform for European enterprises.'),
  ('GulfCloud', 'gulfcloud', 'Cloud Infrastructure', '200-500', 'Dubai, UAE', true, 'Regional cloud platform serving MENA.'),
  ('Barcelona Analytics', 'barcelona-analytics', 'Data / Analytics', '20-50', 'Barcelona, Spain', true, 'Product analytics for marketplaces.'),
  ('Helsinki Robotics', 'helsinki-robotics', 'Robotics', '50-200', 'Helsinki, Finland', true, 'Warehouse automation robotics.'),
  ('Lisbon Fintech', 'lisbon-fintech', 'Fintech', '50-200', 'Lisbon, Portugal', true, 'Embedded payments across Europe.'),
  ('Amsterdam Health', 'amsterdam-health', 'Healthtech', '20-50', 'Amsterdam, Netherlands', true, 'AI for clinical workflow.');

INSERT INTO public.jobs (company_id, title, description, location, remote_policy, employment_type, seniority, salary_min, salary_max, salary_currency, visa_sponsorship, skills)
SELECT c.id, j.title, j.description, j.location, j.remote_policy, 'full-time', j.seniority, j.salary_min, j.salary_max, j.currency, j.visa, j.skills
FROM (VALUES
  ('berlintech-ai', 'Senior AI Engineer', 'Build and ship production LLM features. Own retrieval, evals, latency. Work with PMs to scope, with infra to deploy.', 'Berlin, Germany', 'hybrid', 'senior', 90000, 120000, 'EUR', true, ARRAY['python','llm','pytorch','aws','rag']),
  ('gulfcloud', 'Cloud Solutions Architect', 'Design multi-region cloud solutions for enterprise clients across GCC. Lead migrations from on-prem to cloud-native architectures.', 'Dubai, UAE', 'onsite', 'senior', 35000, 55000, 'AED', true, ARRAY['aws','azure','kubernetes','terraform','architecture']),
  ('barcelona-analytics', 'Senior Data Engineer', 'Own data platform end-to-end. dbt, Snowflake, streaming. Mentor 2 mids.', 'Barcelona, Spain', 'hybrid', 'senior', 60000, 80000, 'EUR', false, ARRAY['python','sql','dbt','snowflake','airflow']),
  ('helsinki-robotics', 'ML Engineer (Perception)', 'Train and deploy perception models for warehouse robots. CV, sensor fusion.', 'Helsinki, Finland', 'onsite', 'mid', 65000, 85000, 'EUR', true, ARRAY['python','pytorch','computer-vision','ros']),
  ('lisbon-fintech', 'Staff Backend Engineer', 'Scale payments rails across 14 EU markets. Go + Postgres. Reliability + ledger correctness.', 'Lisbon, Portugal', 'remote', 'staff', 80000, 110000, 'EUR', false, ARRAY['go','postgres','kafka','distributed-systems']),
  ('amsterdam-health', 'AI Product Engineer', 'Ship AI features end-to-end. RAG over clinical notes. Eval-driven.', 'Amsterdam, Netherlands', 'hybrid', 'mid', 70000, 95000, 'EUR', true, ARRAY['typescript','python','llm','rag','react']),
  ('berlintech-ai', 'Full-Stack Engineer', 'React + Node + Postgres. Ship to production every week. Small team.', 'Remote (EU)', 'remote', 'mid', 60000, 80000, 'EUR', false, ARRAY['typescript','react','node','postgres']),
  ('gulfcloud', 'DevOps Engineer', 'Run k8s clusters across 3 regions. Terraform, observability, on-call rotation.', 'Dubai, UAE', 'hybrid', 'mid', 25000, 40000, 'AED', true, ARRAY['kubernetes','terraform','prometheus','aws']),
  ('barcelona-analytics', 'Senior Frontend Engineer', 'React + TypeScript. Build the analytics canvas. Design partner with PM.', 'Barcelona, Spain', 'remote', 'senior', 55000, 75000, 'EUR', false, ARRAY['typescript','react','d3','tailwind']),
  ('lisbon-fintech', 'Engineering Manager', 'Lead a team of 6 across two squads. Hire, coach, ship.', 'Lisbon, Portugal', 'hybrid', 'manager', 90000, 120000, 'EUR', false, ARRAY['leadership','backend','hiring'])
) AS j(slug, title, description, location, remote_policy, seniority, salary_min, salary_max, currency, visa, skills)
JOIN public.companies c ON c.slug = j.slug;
