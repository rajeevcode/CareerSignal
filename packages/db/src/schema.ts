import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Timestamps are timestamptz in Postgres but the app reads/writes ISO strings,
// so every timestamp column uses mode:'string'. Arrays are native text[]; JSON
// columns are jsonb (returned already-parsed).
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });

// Identity lives in auth.users + profiles. We model `profiles` here for the
// server-side data layer (privileged connection); `id` = auth.users.id.
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  role: text('role', { enum: ['candidate', 'recruiter', 'admin'] }).notNull().default('candidate'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  plan: text('plan', { enum: ['free', 'pro'] }).notNull().default('free'),
  status: text('status', { enum: ['inactive', 'active', 'cancelled', 'past_due', 'trialing'] }).notNull().default('inactive'),
  provider: text('provider'),
  providerCustomerId: text('provider_customer_id'),
  providerSubscriptionId: text('provider_subscription_id'),
  currentPeriodStart: ts('current_period_start'),
  currentPeriodEnd: ts('current_period_end'),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  provider: text('provider'),
  providerPaymentId: text('provider_payment_id'),
  amount: integer('amount'),
  currency: text('currency').notNull().default('INR'),
  status: text('status'),
  createdAt: ts('created_at').notNull(),
});

export const usageLimits = pgTable('usage_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  cvUploadCount: integer('cv_upload_count').notNull().default(0),
  jdMatchCountMonthly: integer('jd_match_count_monthly').notNull().default(0),
  savedJobsCount: integer('saved_jobs_count').notNull().default(0),
  trackedApplicationsCount: integer('tracked_applications_count').notNull().default(0),
  currentMonth: text('current_month'),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const adminFlags = pgTable('admin_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  flagType: text('flag_type'),
  severity: text('severity'),
  status: text('status').notNull().default('open'),
  description: text('description'),
  createdBy: uuid('created_by'),
  createdAt: ts('created_at').notNull(),
});

export const candidateProfiles = pgTable('candidate_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  currentTitle: text('current_title'),
  location: text('location'),
  totalExperienceYears: doublePrecision('total_experience_years'),
  salaryExpectation: doublePrecision('salary_expectation'),
  salaryCurrency: text('salary_currency').notNull().default('INR'),
  noticePeriod: text('notice_period'),
  visaStatus: text('visa_status'),
  remotePreference: text('remote_preference', { enum: ['remote', 'hybrid', 'onsite', 'any'] }).notNull().default('any'),
  targetRoles: text('target_roles').array().notNull().default([]),
  targetMarkets: text('target_markets').array().notNull().default([]),
  careerOutcome: text('career_outcome'),
  careerGoal: text('career_goal'),
  relocationPreference: text('relocation_preference'),
  profileSummary: text('profile_summary'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  portfolioUrl: text('portfolio_url'),
  cvScore: doublePrecision('cv_score'),
  cvScoreBreakdown: jsonb('cv_score_breakdown'),
  cvFeedbackJson: jsonb('cv_feedback_json'),
  onboardingStep: integer('onboarding_step').notNull().default(0),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const candidateExperience = pgTable('candidate_experience', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  title: text('title').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  location: text('location'),
  description: text('description'),
  achievements: text('achievements').array().notNull().default([]),
  skillsUsed: text('skills_used').array().notNull().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').notNull(),
});

export const candidateSkills = pgTable('candidate_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  skillName: text('skill_name').notNull(),
  skillLevel: text('skill_level', { enum: ['beginner', 'intermediate', 'advanced', 'expert'] }),
  yearsExperience: doublePrecision('years_experience'),
  source: text('source', { enum: ['cv', 'manual', 'linkedin'] }).notNull().default('cv'),
  createdAt: ts('created_at').notNull(),
});

export const cvUploads = pgTable('cv_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  parsedJson: jsonb('parsed_json'),
  parsedText: text('parsed_text'),
  atsScore: doublePrecision('ats_score'),
  isPrimary: boolean('is_primary').notNull().default(false),
  uploadedAt: ts('uploaded_at').notNull(),
});

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  website: text('website'),
  industry: text('industry'),
  size: text('size'),
  location: text('location'),
  verified: boolean('verified').notNull().default(false),
  trustScore: doublePrecision('trust_score'),
  description: text('description'),
  logoUrl: text('logo_url'),
  createdAt: ts('created_at').notNull(),
});

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  location: text('location'),
  remoteType: text('remote_type', { enum: ['remote', 'hybrid', 'onsite'] }).notNull().default('onsite'),
  salaryMin: doublePrecision('salary_min'),
  salaryMax: doublePrecision('salary_max'),
  salaryCurrency: text('salary_currency').notNull().default('INR'),
  experienceMin: integer('experience_min'),
  experienceMax: integer('experience_max'),
  requiredSkills: text('required_skills').array().notNull().default([]),
  niceToHaveSkills: text('nice_to_have_skills').array().notNull().default([]),
  employmentType: text('employment_type', { enum: ['full_time', 'contract', 'internship', 'part_time'] }).notNull().default('full_time'),
  visaSponsorship: boolean('visa_sponsorship').notNull().default(false),
  functionTag: text('function_tag'),
  techStack: text('tech_stack').array().notNull().default([]),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'),
  sourceUrl: text('source_url'),
  externalId: text('external_id'),
  applicantCount: integer('applicant_count').notNull().default(0),
  salaryDisclosed: boolean('salary_disclosed').notNull().default(true),
  scamRisk: text('scam_risk', { enum: ['low', 'medium', 'high'] }).default('low'),
  jdClarity: text('jd_clarity', { enum: ['high', 'medium', 'low'] }).default('medium'),
  recruiterId: uuid('recruiter_id'),
  postedAt: ts('posted_at').notNull(),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const savedJobs = pgTable('saved_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: ts('created_at').notNull(),
}, (table) => ({
  uniqueSaved: uniqueIndex('saved_jobs_candidate_job').on(table.candidateId, table.jobId),
}));

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: [
      'saved', 'applied', 'viewed', 'recruiter_viewed', 'shortlisted', 'hr_screen',
      'technical_round', 'case_study', 'final_round', 'interview', 'offer',
      'rejected', 'ghosted', 'follow_up_needed',
    ],
  }).notNull().default('applied'),
  cvVersionId: uuid('cv_version_id'),
  matchScore: doublePrecision('match_score'),
  interviewProbability: doublePrecision('interview_probability'),
  followUpDueAt: ts('follow_up_due_at'),
  nextAction: text('next_action'),
  appliedAt: ts('applied_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
}, (table) => ({
  uniqueApplication: uniqueIndex('applications_candidate_job').on(table.candidateId, table.jobId),
}));

export const matchScores = pgTable('match_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  skillScore: doublePrecision('skill_score').notNull().default(0),
  experienceScore: doublePrecision('experience_score').notNull().default(0),
  roleSimilarityScore: doublePrecision('role_similarity_score').notNull().default(0),
  domainScore: doublePrecision('domain_score').notNull().default(0),
  seniorityScore: doublePrecision('seniority_score').notNull().default(0),
  locationScore: doublePrecision('location_score').notNull().default(0),
  cvScore: doublePrecision('cv_score').notNull().default(0),
  competitionScore: doublePrecision('competition_score').notNull().default(50),
  freshnessScore: doublePrecision('freshness_score').notNull().default(50),
  finalScore: doublePrecision('final_score').notNull().default(0),
  jdMatchScore: doublePrecision('jd_match_score'),
  interviewSignal: doublePrecision('interview_signal'),
  explanationJson: jsonb('explanation_json'),
  computedAt: ts('computed_at').notNull(),
}, (table) => ({
  uniqueMatch: uniqueIndex('match_scores_candidate_job').on(table.candidateId, table.jobId),
}));

export const jdAnalyses = pgTable('jd_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jdText: text('jd_text').notNull(),
  jobTitle: text('job_title'),
  jdMatchScore: doublePrecision('jd_match_score'),
  interviewSignal: doublePrecision('interview_signal'),
  breakdownJson: jsonb('breakdown_json'),
  gapJson: jsonb('gap_json'),
  createdAt: ts('created_at').notNull(),
});

export const cvVersions = pgTable('cv_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  contentJson: jsonb('content_json').notNull().default({}),
  targetRole: text('target_role'),
  targetMarket: text('target_market'),
  cvScore: doublePrecision('cv_score'),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const interviewPrepSessions = pgTable('interview_prep_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  readinessScore: doublePrecision('readiness_score'),
  questionsJson: jsonb('questions_json'),
  companySummary: text('company_summary'),
  plan3090: text('plan_30_90'),
  createdAt: ts('created_at').notNull(),
});

export const starStories = pgTable('star_stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  situation: text('situation'),
  task: text('task'),
  action: text('action'),
  result: text('result'),
  createdAt: ts('created_at').notNull(),
});

export const coachMessages = pgTable('coach_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: ts('created_at').notNull(),
});

export const jobReports = pgTable('job_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  reporterId: uuid('reporter_id'),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['open', 'reviewed', 'dismissed'] }).notNull().default('open'),
  createdAt: ts('created_at').notNull(),
});

export const recruiterProfiles = pgTable('recruiter_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  companyId: uuid('company_id').references(() => companies.id),
  title: text('title'),
  verified: boolean('verified').notNull().default(false),
  createdAt: ts('created_at').notNull(),
});

export const coverLetters = pgTable('cover_letters', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'set null' }),
  cvVersionId: uuid('cv_version_id').references(() => cvVersions.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  tone: text('tone'),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const interviewSessions = pgTable('interview_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  roleTitle: text('role_title').notNull(),
  companyName: text('company_name'),
  mode: text('mode', { enum: ['behavioral', 'technical', 'company'] }).notNull().default('behavioral'),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull().default('medium'),
  overallScore: doublePrecision('overall_score'),
  summary: text('summary'),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'set null' }),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const interviewMessages = pgTable('interview_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => interviewSessions.id, { onDelete: 'cascade' }),
  turnIndex: integer('turn_index').notNull(),
  question: text('question').notNull(),
  answer: text('answer'),
  feedbackJson: jsonb('feedback_json'),
  score: doublePrecision('score'),
  createdAt: ts('created_at').notNull(),
});
