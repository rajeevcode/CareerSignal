export type UserRole = 'candidate' | 'recruiter' | 'admin';

export type RemoteType = 'remote' | 'hybrid' | 'onsite';
export type EmploymentType = 'full_time' | 'contract' | 'internship' | 'part_time';
export type JobStatus = 'draft' | 'published' | 'closed';
export type ApplicationStatus = 'applied' | 'viewed' | 'shortlisted' | 'rejected' | 'interview' | 'offer' | 'ghosted';
export type RemotePreference = 'remote' | 'hybrid' | 'onsite' | 'any';
export type SkillSource = 'cv' | 'manual' | 'linkedin';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  current_title: string | null;
  location: string | null;
  total_experience_years: number | null;
  salary_expectation: number | null;
  salary_currency: string;
  notice_period: string | null;
  visa_status: string | null;
  remote_preference: RemotePreference;
  target_roles: string[];
  profile_summary: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  cv_score: number | null;
  cv_score_breakdown?: CvScoreBreakdown | null;
  cv_feedback?: CvFeedback | null;
  onboarding_step: number;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface CvScoreBreakdown {
  ats_parseability: number;
  formatting: number;
  keyword_strength: number;
  impact_metrics: number;
  role_clarity: number;
  seniority_signal: number;
  skill_relevance: number;
  readability: number;
}

export interface CvFeedback {
  good: string[];
  weak: string[];
  rewrite: string[];
  missing_keywords: string[];
}

export interface JdMatchBreakdown {
  required_skills_score: number;
  nice_to_have_score: number;
  experience_score: number;
  role_similarity_score: number;
  domain_score: number;
  seniority_score: number;
  keyword_match_score: number;
  location_visa_score: number;
  salary_notice_score: number;
  jd_match_score: number;
}

export interface ProbabilityMapEntry {
  label: string;
  avg_score: number;
  job_count: number;
  source: 'target_role' | 'function_tag';
}

export interface CandidateExperience {
  id: string;
  candidate_id: string;
  company: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  description: string | null;
  achievements: string[];
  skills_used: string[];
}

export interface CandidateSkill {
  id: string;
  candidate_id: string;
  skill_name: string;
  skill_level: SkillLevel | null;
  years_experience: number | null;
  source: SkillSource;
}

export interface CvUpload {
  id: string;
  candidate_id: string;
  file_path: string;
  file_name: string;
  parsed_json: Record<string, unknown> | null;
  parsed_text: string | null;
  ats_score: number | null;
  is_primary: boolean;
  uploaded_at: string;
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  location: string | null;
  verified: boolean;
  description: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  remote_type: RemoteType;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  experience_min: number | null;
  experience_max: number | null;
  required_skills: string[];
  nice_to_have_skills: string[];
  employment_type: EmploymentType;
  visa_sponsorship: boolean;
  function_tag: string | null;
  tech_stack: string[];
  status: JobStatus;
  source_url: string | null;
  external_id: string | null;
  posted_at: string;
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  status: ApplicationStatus;
  cv_version_id: string | null;
  match_score: number | null;
  interview_probability: number | null;
  applied_at: string;
  updated_at: string;
  job?: Job;
}

export interface MatchScoreBreakdown {
  skill_score: number;
  experience_score: number;
  role_similarity_score: number;
  domain_score: number;
  seniority_score: number;
  location_score: number;
  cv_score: number;
  competition_score: number;
  freshness_score: number;
  final_score: number;
  jd_match_score?: number;
  interview_signal?: number;
}

export interface MatchExplanation {
  summary: string;
  strengths: string[];
  gaps: string[];
  improvements: string[];
  competition_level: 'low' | 'medium' | 'high';
  category?: 'best_match' | 'stretch' | 'visa_friendly' | 'low_competition';
}

export interface CvGapAnalysis {
  missing_keywords: string[];
  weak_bullets: string[];
  skills_to_add: string[];
  suggested_summary: string;
  suggested_bullets: string[];
  current_fit: number;
  projected_fit: number;
  ats_match_score: number;
  recruiter_readability_score: number;
  risk_notes: string[];
}

export interface MatchScore extends MatchScoreBreakdown {
  id: string;
  candidate_id: string;
  job_id: string;
  explanation_json: MatchExplanation & { cv_gap?: CvGapAnalysis };
  computed_at: string;
  job?: Job;
}

export interface JobFilters {
  q?: string;
  location?: string;
  remote_type?: RemoteType;
  salary_min?: number;
  experience_min?: number;
  experience_max?: number;
  visa_sponsorship?: boolean;
  function_tag?: string;
  tech_stack?: string;
  employment_type?: EmploymentType;
  posted_within_days?: number;
}

export interface DashboardStats {
  total_matched: number;
  high_probability_count: number;
  applications_sent: number;
  cv_score: number | null;
  top_missing_skills: string[];
  recommended_actions: string[];
}

export const CV_SCORE_WEIGHTS = {
  ats_parseability: 0.15,
  formatting: 0.10,
  keyword_strength: 0.15,
  impact_metrics: 0.20,
  role_clarity: 0.15,
  seniority_signal: 0.10,
  skill_relevance: 0.10,
  readability: 0.05,
} as const;

export const JD_MATCH_WEIGHTS = {
  required_skills: 0.25,
  experience: 0.20,
  role_similarity: 0.15,
  domain: 0.10,
  seniority: 0.10,
  keyword: 0.10,
  location_visa: 0.05,
  salary_notice: 0.05,
} as const;

export const INTERVIEW_SIGNAL_WEIGHTS = {
  jd_match: 0.50,
  cv_score: 0.20,
  freshness: 0.10,
  competition: 0.10,
  availability: 0.05,
  recruiter_activity: 0.05,
} as const;

export const MATCH_WEIGHTS = {
  skill: 0.25,
  experience: 0.20,
  role_similarity: 0.15,
  domain: 0.10,
  seniority: 0.10,
  location: 0.08,
  cv: 0.07,
  competition: 0.03,
  freshness: 0.02,
} as const;

export function computeFinalScore(breakdown: MatchScoreBreakdown): number {
  return Math.round(
    breakdown.skill_score * MATCH_WEIGHTS.skill +
    breakdown.experience_score * MATCH_WEIGHTS.experience +
    breakdown.role_similarity_score * MATCH_WEIGHTS.role_similarity +
    breakdown.domain_score * MATCH_WEIGHTS.domain +
    breakdown.seniority_score * MATCH_WEIGHTS.seniority +
    breakdown.location_score * MATCH_WEIGHTS.location +
    breakdown.cv_score * MATCH_WEIGHTS.cv +
    breakdown.competition_score * MATCH_WEIGHTS.competition +
    breakdown.freshness_score * MATCH_WEIGHTS.freshness
  );
}

export function getSignalBand(score: number): string {
  if (score >= 85) return 'Very Strong Signal';
  if (score >= 70) return 'Strong Signal';
  if (score >= 55) return 'Moderate Signal';
  if (score >= 40) return 'Weak Signal';
  return 'Low Signal';
}

export function getProbabilityLabel(score: number): string {
  if (score >= 85) return 'Very Strong';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Moderate';
  if (score >= 40) return 'Weak';
  return 'Low';
}

export function getProbabilityColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 55) return 'text-amber-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}
