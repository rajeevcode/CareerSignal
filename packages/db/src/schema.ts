import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['candidate', 'recruiter', 'admin'] }).notNull().default('candidate'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const candidateProfiles = sqliteTable('candidate_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  currentTitle: text('current_title'),
  location: text('location'),
  totalExperienceYears: real('total_experience_years'),
  salaryExpectation: real('salary_expectation'),
  salaryCurrency: text('salary_currency').notNull().default('INR'),
  noticePeriod: text('notice_period'),
  visaStatus: text('visa_status'),
  remotePreference: text('remote_preference', { enum: ['remote', 'hybrid', 'onsite', 'any'] }).notNull().default('any'),
  targetRoles: text('target_roles').notNull().default('[]'),
  profileSummary: text('profile_summary'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  portfolioUrl: text('portfolio_url'),
  cvScore: real('cv_score'),
  cvScoreBreakdown: text('cv_score_breakdown'),
  cvFeedbackJson: text('cv_feedback_json'),
  embedding: text('embedding'),
  onboardingStep: integer('onboarding_step').notNull().default(0),
  onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const candidateExperience = sqliteTable('candidate_experience', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  title: text('title').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  location: text('location'),
  description: text('description'),
  achievements: text('achievements').notNull().default('[]'),
  skillsUsed: text('skills_used').notNull().default('[]'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const candidateSkills = sqliteTable('candidate_skills', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  skillName: text('skill_name').notNull(),
  skillLevel: text('skill_level', { enum: ['beginner', 'intermediate', 'advanced', 'expert'] }),
  yearsExperience: real('years_experience'),
  source: text('source', { enum: ['cv', 'manual', 'linkedin'] }).notNull().default('cv'),
  createdAt: text('created_at').notNull(),
});

export const cvUploads = sqliteTable('cv_uploads', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  parsedJson: text('parsed_json'),
  parsedText: text('parsed_text'),
  atsScore: real('ats_score'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  uploadedAt: text('uploaded_at').notNull(),
});

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  website: text('website'),
  industry: text('industry'),
  size: text('size'),
  location: text('location'),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  description: text('description'),
  logoUrl: text('logo_url'),
  createdAt: text('created_at').notNull(),
});

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  location: text('location'),
  remoteType: text('remote_type', { enum: ['remote', 'hybrid', 'onsite'] }).notNull().default('onsite'),
  salaryMin: real('salary_min'),
  salaryMax: real('salary_max'),
  salaryCurrency: text('salary_currency').notNull().default('INR'),
  experienceMin: integer('experience_min'),
  experienceMax: integer('experience_max'),
  requiredSkills: text('required_skills').notNull().default('[]'),
  niceToHaveSkills: text('nice_to_have_skills').notNull().default('[]'),
  employmentType: text('employment_type', { enum: ['full_time', 'contract', 'internship', 'part_time'] }).notNull().default('full_time'),
  visaSponsorship: integer('visa_sponsorship', { mode: 'boolean' }).notNull().default(false),
  functionTag: text('function_tag'),
  techStack: text('tech_stack').notNull().default('[]'),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'),
  sourceUrl: text('source_url'),
  externalId: text('external_id'),
  applicantCount: integer('applicant_count').notNull().default(0),
  embedding: text('embedding'),
  postedAt: text('posted_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const savedJobs = sqliteTable('saved_jobs', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  uniqueSaved: uniqueIndex('saved_jobs_candidate_job').on(table.candidateId, table.jobId),
}));

export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['applied', 'viewed', 'shortlisted', 'rejected', 'interview', 'offer', 'ghosted'] }).notNull().default('applied'),
  cvVersionId: text('cv_version_id'),
  matchScore: real('match_score'),
  interviewProbability: real('interview_probability'),
  appliedAt: text('applied_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  uniqueApplication: uniqueIndex('applications_candidate_job').on(table.candidateId, table.jobId),
}));

export const matchScores = sqliteTable('match_scores', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  skillScore: real('skill_score').notNull().default(0),
  experienceScore: real('experience_score').notNull().default(0),
  roleSimilarityScore: real('role_similarity_score').notNull().default(0),
  domainScore: real('domain_score').notNull().default(0),
  seniorityScore: real('seniority_score').notNull().default(0),
  locationScore: real('location_score').notNull().default(0),
  cvScore: real('cv_score').notNull().default(0),
  competitionScore: real('competition_score').notNull().default(50),
  freshnessScore: real('freshness_score').notNull().default(50),
  finalScore: real('final_score').notNull().default(0),
  jdMatchScore: real('jd_match_score'),
  interviewSignal: real('interview_signal'),
  explanationJson: text('explanation_json'),
  computedAt: text('computed_at').notNull(),
}, (table) => ({
  uniqueMatch: uniqueIndex('match_scores_candidate_job').on(table.candidateId, table.jobId),
}));

export const jdAnalyses = sqliteTable('jd_analyses', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jdText: text('jd_text').notNull(),
  jobTitle: text('job_title'),
  jdMatchScore: real('jd_match_score'),
  interviewSignal: real('interview_signal'),
  breakdownJson: text('breakdown_json'),
  gapJson: text('gap_json'),
  createdAt: text('created_at').notNull(),
});
