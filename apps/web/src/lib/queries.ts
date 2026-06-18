import { eq, and, desc } from 'drizzle-orm';
import {
  getDb,
  jobs,
  companies,
  candidateProfiles,
  candidateSkills,
  candidateExperience,
  savedJobs,
  applications,
  matchScores,
  cvUploads,
  mapJob,
  mapCompany,
  mapCandidateProfile,
  mapMatchScore,
  parseJsonArray,
  toIsoNow,
} from '@careersignal/db';
import type { JobFilters, ProbabilityMapEntry } from '@careersignal/shared';

export function getCandidateByUserId(userId: string) {
  const db = getDb();
  const row = db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).get();
  return row ? mapCandidateProfile(row) : null;
}

export function getCandidateRowByUserId(userId: string) {
  const db = getDb();
  return db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).get();
}

export function listPublishedJobs(filters: JobFilters = {}) {
  const db = getDb();
  let query = db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.status, 'published'))
    .orderBy(desc(jobs.postedAt))
    .$dynamic();

  const rows = query.all();
  return rows
    .map(({ job, company }) => mapJob(job, mapCompany(company)))
    .filter((job) => {
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!job.title.toLowerCase().includes(q) && !job.description.toLowerCase().includes(q)) return false;
      }
      if (filters.location && !job.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.remote_type && job.remote_type !== filters.remote_type) return false;
      if (filters.function_tag && job.function_tag !== filters.function_tag) return false;
      if (filters.experience_min != null && job.experience_min != null && job.experience_min > filters.experience_min) return false;
      if (filters.visa_sponsorship && !job.visa_sponsorship) return false;
      return true;
    });
}

export function getJobById(id: string) {
  const db = getDb();
  const row = db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(eq(jobs.id, id), eq(jobs.status, 'published')))
    .get();
  if (!row) return null;
  return mapJob(row.job, mapCompany(row.company));
}

export function isJobSaved(candidateId: string, jobId: string) {
  const db = getDb();
  return !!db.select().from(savedJobs)
    .where(and(eq(savedJobs.candidateId, candidateId), eq(savedJobs.jobId, jobId)))
    .get();
}

export function hasApplied(candidateId: string, jobId: string) {
  const db = getDb();
  return !!db.select().from(applications)
    .where(and(eq(applications.candidateId, candidateId), eq(applications.jobId, jobId)))
    .get();
}

export function getMatchScore(candidateId: string, jobId: string) {
  const db = getDb();
  const row = db.select().from(matchScores)
    .where(and(eq(matchScores.candidateId, candidateId), eq(matchScores.jobId, jobId)))
    .get();
  return row ? mapMatchScore(row) : null;
}

export function listMatchScoresForCandidate(candidateId: string) {
  const db = getDb();
  const rows = db.select().from(matchScores)
    .where(eq(matchScores.candidateId, candidateId))
    .orderBy(desc(matchScores.finalScore))
    .all();

  return rows.map((row) => {
    const jobRow = db
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.id, row.jobId))
      .get();
    const job = jobRow ? mapJob(jobRow.job, mapCompany(jobRow.company)) : undefined;
    return mapMatchScore(row, job);
  });
}

export function countMatchScores(candidateId: string, minScore?: number) {
  const db = getDb();
  const rows = db.select().from(matchScores).where(eq(matchScores.candidateId, candidateId)).all();
  if (minScore == null) return rows.length;
  return rows.filter((r) => r.finalScore >= minScore).length;
}

export function countApplications(candidateId: string) {
  const db = getDb();
  return db.select().from(applications).where(eq(applications.candidateId, candidateId)).all().length;
}

export function listSavedJobs(candidateId: string) {
  const db = getDb();
  const rows = db.select().from(savedJobs)
    .where(eq(savedJobs.candidateId, candidateId))
    .orderBy(desc(savedJobs.createdAt))
    .all();

  return rows.map((saved) => {
    const jobRow = db
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.id, saved.jobId))
      .get();
    return jobRow ? mapJob(jobRow.job, mapCompany(jobRow.company)) : null;
  }).filter(Boolean);
}

export function listApplications(candidateId: string) {
  const db = getDb();
  return db.select().from(applications)
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.appliedAt))
    .all();
}

export function listCvUploads(candidateId: string) {
  const db = getDb();
  return db.select().from(cvUploads)
    .where(eq(cvUploads.candidateId, candidateId))
    .orderBy(desc(cvUploads.uploadedAt))
    .all();
}

export function listAllJobs() {
  const db = getDb();
  return db.select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .orderBy(desc(jobs.createdAt))
    .all()
    .map(({ job, company }) => mapJob(job, mapCompany(company)));
}

export function listCompanies() {
  const db = getDb();
  return db.select().from(companies).orderBy(companies.name).all().map(mapCompany);
}

export function listCandidateSkills(candidateId: string) {
  const db = getDb();
  return db.select().from(candidateSkills).where(eq(candidateSkills.candidateId, candidateId)).all();
}

export function listCandidateExperience(candidateId: string) {
  const db = getDb();
  return db.select().from(candidateExperience)
    .where(eq(candidateExperience.candidateId, candidateId))
    .orderBy(candidateExperience.sortOrder)
    .all();
}

function roleMatchesJobTitle(role: string, jobTitle: string): boolean {
  const roleTokens = role.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const titleLower = jobTitle.toLowerCase();
  if (titleLower.includes(role.toLowerCase())) return true;
  const matched = roleTokens.filter((t) => titleLower.includes(t));
  return matched.length >= Math.min(2, roleTokens.length);
}

export function getProbabilityMapByCategory(candidateId: string): ProbabilityMapEntry[] {
  const db = getDb();
  const candidate = db.select().from(candidateProfiles).where(eq(candidateProfiles.id, candidateId)).get();
  if (!candidate) return [];

  const matches = listMatchScoresForCandidate(candidateId).filter((m) => m.job);
  if (matches.length === 0) return [];

  const targetRoles = parseJsonArray<string>(candidate.targetRoles);

  if (targetRoles.length > 0) {
    const entries: ProbabilityMapEntry[] = [];
    for (const role of targetRoles) {
      const roleMatches = matches.filter((m) => m.job && roleMatchesJobTitle(role, m.job!.title));
      if (roleMatches.length === 0) continue;
      const avg = roleMatches.reduce((sum, m) => sum + m.final_score, 0) / roleMatches.length;
      entries.push({
        label: role,
        avg_score: Math.round(avg),
        job_count: roleMatches.length,
        source: 'target_role',
      });
    }
    if (entries.length > 0) {
      return entries.sort((a, b) => b.avg_score - a.avg_score).slice(0, 6);
    }
  }

  const byTag = new Map<string, { total: number; count: number }>();
  for (const m of matches) {
    const tag = m.job?.function_tag || 'Other';
    const existing = byTag.get(tag) || { total: 0, count: 0 };
    existing.total += m.final_score;
    existing.count += 1;
    byTag.set(tag, existing);
  }

  return Array.from(byTag.entries())
    .map(([label, { total, count }]) => ({
      label,
      avg_score: Math.round(total / count),
      job_count: count,
      source: 'function_tag' as const,
    }))
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 6);
}

export function setOnboardingStep(userId: string, step: number) {
  const db = getDb();
  db.update(candidateProfiles).set({
    onboardingStep: step,
    updatedAt: toIsoNow(),
  }).where(eq(candidateProfiles.userId, userId)).run();
}
