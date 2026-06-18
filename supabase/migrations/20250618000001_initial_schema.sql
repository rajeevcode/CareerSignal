-- CareerSignal MVP schema
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Custom types
CREATE TYPE user_role AS ENUM ('candidate', 'recruiter', 'admin');
CREATE TYPE remote_type AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE remote_preference AS ENUM ('remote', 'hybrid', 'onsite', 'any');
CREATE TYPE employment_type AS ENUM ('full_time', 'contract', 'internship', 'part_time');
CREATE TYPE job_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE application_status AS ENUM ('applied', 'viewed', 'shortlisted', 'rejected', 'interview', 'offer', 'ghosted');
CREATE TYPE skill_source AS ENUM ('cv', 'manual', 'linkedin');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'candidate',
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidate profiles
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  current_title TEXT,
  location TEXT,
  total_experience_years NUMERIC(4,1),
  salary_expectation NUMERIC(12,2),
  salary_currency TEXT NOT NULL DEFAULT 'INR',
  notice_period TEXT,
  visa_status TEXT,
  remote_preference remote_preference NOT NULL DEFAULT 'any',
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  profile_summary TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  cv_score NUMERIC(5,2),
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  location TEXT,
  description TEXT,
  achievements TEXT[] NOT NULL DEFAULT '{}',
  skills_used TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_level skill_level,
  years_experience NUMERIC(4,1),
  source skill_source NOT NULL DEFAULT 'cv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, skill_name)
);

CREATE TABLE cv_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  parsed_json JSONB,
  parsed_text TEXT,
  ats_score NUMERIC(5,2),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  size TEXT,
  location TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  remote_type remote_type NOT NULL DEFAULT 'onsite',
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
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
  embedding vector(1536),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'applied',
  cv_version_id UUID REFERENCES cv_uploads(id) ON DELETE SET NULL,
  match_score NUMERIC(5,2),
  interview_probability NUMERIC(5,2),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE match_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  experience_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  role_similarity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  domain_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  location_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  cv_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  competition_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  freshness_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  final_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  explanation_json JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

-- Indexes
CREATE INDEX idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_required_skills ON jobs USING GIN(required_skills);
CREATE INDEX idx_jobs_tech_stack ON jobs USING GIN(tech_stack);
CREATE INDEX idx_jobs_search ON jobs USING GIN(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_match_scores_candidate ON match_scores(candidate_id, final_score DESC);
CREATE INDEX idx_match_scores_job ON match_scores(job_id, final_score DESC);
CREATE INDEX idx_applications_candidate ON applications(candidate_id, applied_at DESC);

-- Vector indexes (HNSW)
CREATE INDEX idx_candidate_profiles_embedding ON candidate_profiles USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO candidate_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get candidate profile id for current user
CREATE OR REPLACE FUNCTION get_candidate_id()
RETURNS UUID AS $$
  SELECT id FROM candidate_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
