-- Row Level Security policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- Candidate profiles
CREATE POLICY "Candidates can view own profile" ON candidate_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Candidates can update own profile" ON candidate_profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all candidate profiles" ON candidate_profiles
  FOR ALL USING (is_admin());
CREATE POLICY "Service role full access candidate_profiles" ON candidate_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Candidate experience
CREATE POLICY "Candidates manage own experience" ON candidate_experience
  FOR ALL USING (
    candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Service role full access candidate_experience" ON candidate_experience
  FOR ALL USING (auth.role() = 'service_role');

-- Candidate skills
CREATE POLICY "Candidates manage own skills" ON candidate_skills
  FOR ALL USING (
    candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Service role full access candidate_skills" ON candidate_skills
  FOR ALL USING (auth.role() = 'service_role');

-- CV uploads
CREATE POLICY "Candidates manage own CVs" ON cv_uploads
  FOR ALL USING (
    candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Service role full access cv_uploads" ON cv_uploads
  FOR ALL USING (auth.role() = 'service_role');

-- Companies (public read, admin write)
CREATE POLICY "Anyone can view companies" ON companies
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage companies" ON companies
  FOR ALL USING (is_admin());
CREATE POLICY "Service role full access companies" ON companies
  FOR ALL USING (auth.role() = 'service_role');

-- Jobs (public read published, admin write)
CREATE POLICY "Anyone can view published jobs" ON jobs
  FOR SELECT USING (status = 'published' OR is_admin());
CREATE POLICY "Admins can manage jobs" ON jobs
  FOR ALL USING (is_admin());
CREATE POLICY "Service role full access jobs" ON jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Saved jobs
CREATE POLICY "Candidates manage saved jobs" ON saved_jobs
  FOR ALL USING (
    candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
  );

-- Applications
CREATE POLICY "Candidates manage own applications" ON applications
  FOR ALL USING (
    candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can view all applications" ON applications
  FOR SELECT USING (is_admin());

-- Match scores
CREATE POLICY "Candidates view own match scores" ON match_scores
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Service role full access match_scores" ON match_scores
  FOR ALL USING (auth.role() = 'service_role');

-- Storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-uploads',
  'cv-uploads',
  false,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Candidates upload own CVs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'cv-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Candidates view own CVs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cv-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Candidates delete own CVs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'cv-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Service role full access cv storage" ON storage.objects
  FOR ALL USING (bucket_id = 'cv-uploads' AND auth.role() = 'service_role');
