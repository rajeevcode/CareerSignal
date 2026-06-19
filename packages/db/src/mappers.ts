import type { Company, Job, CandidateProfile, MatchScore, Application } from '@careersignal/shared';
import {
  parseJsonArray,
  parseJsonObject,
} from './client';
import type {
  companies,
  jobs,
  candidateProfiles,
  matchScores,
  applications,
  coverLetters,
  interviewSessions,
  interviewMessages,
} from './schema';

type DbCompany = typeof companies.$inferSelect;
type DbJob = typeof jobs.$inferSelect;
type DbCandidate = typeof candidateProfiles.$inferSelect;
type DbMatch = typeof matchScores.$inferSelect;
type DbCoverLetter = typeof coverLetters.$inferSelect;
type DbInterviewSession = typeof interviewSessions.$inferSelect;
type DbInterviewMessage = typeof interviewMessages.$inferSelect;

export function mapCompany(row: DbCompany): Company {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    industry: row.industry,
    size: row.size,
    location: row.location,
    verified: row.verified,
    description: row.description,
    logo_url: row.logoUrl,
    created_at: row.createdAt,
  };
}

export function mapJob(row: DbJob, company?: Company | null): Job {
  return {
    id: row.id,
    company_id: row.companyId,
    title: row.title,
    description: row.description,
    location: row.location,
    remote_type: row.remoteType,
    salary_min: row.salaryMin,
    salary_max: row.salaryMax,
    salary_currency: row.salaryCurrency,
    experience_min: row.experienceMin,
    experience_max: row.experienceMax,
    required_skills: parseJsonArray(row.requiredSkills),
    nice_to_have_skills: parseJsonArray(row.niceToHaveSkills),
    employment_type: row.employmentType,
    visa_sponsorship: row.visaSponsorship,
    function_tag: row.functionTag,
    tech_stack: parseJsonArray(row.techStack),
    status: row.status,
    source_url: row.sourceUrl,
    external_id: row.externalId,
    posted_at: row.postedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    company: company || undefined,
  };
}

export function mapCandidateProfile(row: DbCandidate): CandidateProfile {
  return {
    id: row.id,
    user_id: row.userId,
    current_title: row.currentTitle,
    location: row.location,
    total_experience_years: row.totalExperienceYears,
    salary_expectation: row.salaryExpectation,
    salary_currency: row.salaryCurrency,
    notice_period: row.noticePeriod,
    visa_status: row.visaStatus,
    remote_preference: row.remotePreference,
    target_roles: parseJsonArray(row.targetRoles),
    profile_summary: row.profileSummary,
    linkedin_url: row.linkedinUrl,
    github_url: row.githubUrl,
    portfolio_url: row.portfolioUrl,
    cv_score: row.cvScore,
    cv_score_breakdown: parseJsonObject(row.cvScoreBreakdown),
    cv_feedback: parseJsonObject(row.cvFeedbackJson),
    onboarding_step: row.onboardingStep ?? 0,
    onboarding_complete: row.onboardingComplete ?? false,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function mapMatchScore(row: DbMatch, job?: Job): MatchScore {
  return {
    id: row.id,
    candidate_id: row.candidateId,
    job_id: row.jobId,
    skill_score: row.skillScore,
    experience_score: row.experienceScore,
    role_similarity_score: row.roleSimilarityScore,
    domain_score: row.domainScore,
    seniority_score: row.seniorityScore ?? 50,
    location_score: row.locationScore,
    cv_score: row.cvScore,
    competition_score: row.competitionScore,
    freshness_score: row.freshnessScore,
    final_score: row.finalScore,
    jd_match_score: row.jdMatchScore ?? undefined,
    interview_signal: row.interviewSignal ?? row.finalScore,
    explanation_json: parseJsonObject(row.explanationJson) || {
      summary: '',
      strengths: [],
      gaps: [],
      improvements: [],
      competition_level: 'medium',
    },
    computed_at: row.computedAt,
    job,
  };
}

export function mapApplication(row: typeof applications.$inferSelect, job?: Job): Application {
  return {
    id: row.id,
    candidate_id: row.candidateId,
    job_id: row.jobId,
    status: row.status,
    cv_version_id: row.cvVersionId,
    match_score: row.matchScore,
    interview_probability: row.interviewProbability,
    applied_at: row.appliedAt,
    updated_at: row.updatedAt,
    job,
  };
}

/** Row shape used by the Python AI service (snake_case, parsed JSON fields). */
export function mapCandidateForAi(row: DbCandidate, skills: string[]) {
  return {
    id: row.id,
    user_id: row.userId,
    current_title: row.currentTitle,
    location: row.location,
    total_experience_years: row.totalExperienceYears,
    remote_preference: row.remotePreference,
    target_roles: parseJsonArray(row.targetRoles),
    profile_summary: row.profileSummary,
    visa_status: row.visaStatus,
    cv_score: row.cvScore,
    embedding: null,
    skills,
  };
}

export function mapJobForAi(row: DbJob) {
  return {
    id: row.id,
    company_id: row.companyId,
    title: row.title,
    description: row.description,
    location: row.location,
    remote_type: row.remoteType,
    experience_min: row.experienceMin,
    experience_max: row.experienceMax,
    required_skills: parseJsonArray(row.requiredSkills),
    nice_to_have_skills: parseJsonArray(row.niceToHaveSkills),
    visa_sponsorship: row.visaSponsorship,
    function_tag: row.functionTag,
    tech_stack: parseJsonArray(row.techStack),
    applicant_count: row.applicantCount,
    posted_at: row.postedAt,
    embedding: null,
  };
}

export function mapCoverLetter(row: DbCoverLetter) {
  return {
    id: row.id,
    candidate_id: row.candidateId,
    job_id: row.jobId,
    application_id: row.applicationId,
    cv_version_id: row.cvVersionId,
    content: row.content,
    tone: row.tone,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function mapInterviewSession(row: DbInterviewSession) {
  return {
    id: row.id,
    candidate_id: row.candidateId,
    role_title: row.roleTitle,
    company_name: row.companyName,
    mode: row.mode,
    difficulty: row.difficulty,
    overall_score: row.overallScore,
    summary: row.summary,
    job_id: row.jobId,
    application_id: row.applicationId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function mapInterviewMessage(row: DbInterviewMessage) {
  return {
    id: row.id,
    session_id: row.sessionId,
    turn_index: row.turnIndex,
    question: row.question,
    answer: row.answer,
    feedback: parseJsonObject(row.feedbackJson),
    score: row.score,
    created_at: row.createdAt,
  };
}

