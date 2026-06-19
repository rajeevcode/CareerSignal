import { eq, and, desc, inArray } from 'drizzle-orm';
import {
  getDb,
  jobs,
  companies,
  profiles,
  candidateProfiles,
  candidateSkills,
  candidateExperience,
  savedJobs,
  applications,
  matchScores,
  cvUploads,
  jobReports,
  recruiterProfiles,
  mapJob,
  mapCompany,
  mapCandidateProfile,
  mapMatchScore,
  mapApplication,
  parseJsonArray,
  toIsoNow,
} from '@careersignal/db';
import type { JobFilters, ProbabilityMapEntry } from '@careersignal/shared';

async function one<T>(query: { then: PromiseLike<T[]>['then'] } | Promise<T[]>): Promise<T | null> {
  const rows = (await query) as T[];
  return rows[0] ?? null;
}

/** Fetch jobs (+company) for a set of ids in ONE query, returned as an id→Job map. */
async function jobMapForIds(ids: string[]) {
  const map = new Map<string, ReturnType<typeof mapJob>>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return map;
  const rows = await getDb()
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(inArray(jobs.id, unique));
  for (const { job, company } of rows) map.set(job.id, mapJob(job, mapCompany(company)));
  return map;
}

export async function getCandidateByUserId(userId: string) {
  const db = getDb();
  const row = await one(db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)));
  return row ? mapCandidateProfile(row) : null;
}

export async function getCandidateRowByUserId(userId: string) {
  const db = getDb();
  return one(db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)));
}

export async function listPublishedJobs(filters: JobFilters = {}) {
  const db = getDb();
  const rows = await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.status, 'published'))
    .orderBy(desc(jobs.postedAt));

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

export async function getJobById(id: string) {
  const db = getDb();
  const row = await one(
    db
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(and(eq(jobs.id, id), eq(jobs.status, 'published'))),
  );
  if (!row) return null;
  return mapJob(row.job, mapCompany(row.company));
}

export async function isJobSaved(candidateId: string, jobId: string) {
  const db = getDb();
  const row = await one(
    db.select().from(savedJobs).where(and(eq(savedJobs.candidateId, candidateId), eq(savedJobs.jobId, jobId))),
  );
  return !!row;
}

export async function hasApplied(candidateId: string, jobId: string) {
  const db = getDb();
  const row = await one(
    db.select().from(applications).where(and(eq(applications.candidateId, candidateId), eq(applications.jobId, jobId))),
  );
  return !!row;
}

export async function getMatchScore(candidateId: string, jobId: string) {
  const db = getDb();
  const row = await one(
    db.select().from(matchScores).where(and(eq(matchScores.candidateId, candidateId), eq(matchScores.jobId, jobId))),
  );
  return row ? mapMatchScore(row) : null;
}

export async function listMatchScoresForCandidate(candidateId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(matchScores)
    .where(eq(matchScores.candidateId, candidateId))
    .orderBy(desc(matchScores.finalScore));

  const jobs_ = await jobMapForIds(rows.map((r) => r.jobId));
  return rows.map((row) => mapMatchScore(row, jobs_.get(row.jobId)));
}

export async function countMatchScores(candidateId: string, minScore?: number) {
  const db = getDb();
  const rows = await db.select().from(matchScores).where(eq(matchScores.candidateId, candidateId));
  if (minScore == null) return rows.length;
  return rows.filter((r) => r.finalScore >= minScore).length;
}

export async function countApplications(candidateId: string) {
  const db = getDb();
  const rows = await db.select().from(applications).where(eq(applications.candidateId, candidateId));
  return rows.length;
}

export async function listSavedJobs(candidateId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(savedJobs)
    .where(eq(savedJobs.candidateId, candidateId))
    .orderBy(desc(savedJobs.createdAt));

  const jobs_ = await jobMapForIds(rows.map((r) => r.jobId));
  // Preserve saved-order (rows are ordered by createdAt desc); drop any missing jobs.
  return rows.map((saved) => jobs_.get(saved.jobId)).filter((j): j is NonNullable<typeof j> => j != null);
}

export async function listApplications(candidateId: string) {
  const db = getDb();
  return db
    .select()
    .from(applications)
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.appliedAt));
}

export async function listCvUploads(candidateId: string) {
  const db = getDb();
  return db
    .select()
    .from(cvUploads)
    .where(eq(cvUploads.candidateId, candidateId))
    .orderBy(desc(cvUploads.uploadedAt));
}

export async function listAllJobs() {
  const db = getDb();
  const rows = await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .orderBy(desc(jobs.createdAt));
  return rows.map(({ job, company }) => mapJob(job, mapCompany(company)));
}

export async function listCompanies() {
  const db = getDb();
  const rows = await db.select().from(companies).orderBy(companies.name);
  return rows.map(mapCompany);
}

export async function listCandidateSkills(candidateId: string) {
  const db = getDb();
  return db.select().from(candidateSkills).where(eq(candidateSkills.candidateId, candidateId));
}

export async function listCandidateExperience(candidateId: string) {
  const db = getDb();
  return db
    .select()
    .from(candidateExperience)
    .where(eq(candidateExperience.candidateId, candidateId))
    .orderBy(candidateExperience.sortOrder);
}

function roleMatchesJobTitle(role: string, jobTitle: string): boolean {
  const roleTokens = role.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const titleLower = jobTitle.toLowerCase();
  if (titleLower.includes(role.toLowerCase())) return true;
  const matched = roleTokens.filter((t) => titleLower.includes(t));
  return matched.length >= Math.min(2, roleTokens.length);
}

export async function getProbabilityMapByCategory(candidateId: string): Promise<ProbabilityMapEntry[]> {
  const db = getDb();
  const candidate = await one(db.select().from(candidateProfiles).where(eq(candidateProfiles.id, candidateId)));
  if (!candidate) return [];

  const matches = (await listMatchScoresForCandidate(candidateId)).filter((m) => m.job);
  if (matches.length === 0) return [];

  const targetRoles = parseJsonArray<string>(candidate.targetRoles);

  if (targetRoles.length > 0) {
    const entries: ProbabilityMapEntry[] = [];
    for (const role of targetRoles) {
      const roleMatches = matches.filter((m) => m.job && roleMatchesJobTitle(role, m.job!.title));
      if (roleMatches.length === 0) continue;
      const avg = roleMatches.reduce((sum, m) => sum + m.final_score, 0) / roleMatches.length;
      entries.push({ label: role, avg_score: Math.round(avg), job_count: roleMatches.length, source: 'target_role' });
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

export async function setOnboardingStep(userId: string, step: number) {
  const db = getDb();
  await db
    .update(candidateProfiles)
    .set({ onboardingStep: step, updatedAt: toIsoNow() })
    .where(eq(candidateProfiles.userId, userId));
}

export async function getRecruiterProfile(userId: string) {
  const db = getDb();
  const row = await one(db.select().from(recruiterProfiles).where(eq(recruiterProfiles.userId, userId)));
  if (!row) return null;
  const company = row.companyId
    ? await one(db.select().from(companies).where(eq(companies.id, row.companyId)))
    : null;
  return { ...row, company: company ? mapCompany(company) : null };
}

export async function listRecruiterJobs(recruiterId: string) {
  const db = getDb();
  const rows = await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.recruiterId, recruiterId))
    .orderBy(desc(jobs.createdAt));
  return rows.map(({ job, company }) => mapJob(job, mapCompany(company)));
}

export async function getRecruiterJob(recruiterId: string, jobId: string) {
  const db = getDb();
  const row = await one(
    db
      .select({ job: jobs, company: companies })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(and(eq(jobs.id, jobId), eq(jobs.recruiterId, recruiterId))),
  );
  if (!row) return null;
  return mapJob(row.job, mapCompany(row.company));
}

export async function listJobApplicants(jobId: string) {
  const db = getDb();
  // Single query: applications joined to the candidate and its profile.
  const rows = await db
    .select({ app: applications, candidate: candidateProfiles, profile: profiles })
    .from(applications)
    .leftJoin(candidateProfiles, eq(candidateProfiles.id, applications.candidateId))
    .leftJoin(profiles, eq(profiles.id, candidateProfiles.userId))
    .where(eq(applications.jobId, jobId))
    .orderBy(desc(applications.appliedAt));

  return rows.map(({ app, candidate, profile }) => ({
    ...mapApplication(app),
    candidate_name: profile?.fullName || 'Candidate',
    candidate_title: candidate?.currentTitle || null,
    match_score: app.matchScore,
  }));
}

export async function countRecruiterApplicants(recruiterId: string) {
  const db = getDb();
  const recruiterJobs = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.recruiterId, recruiterId));
  if (recruiterJobs.length === 0) return 0;
  const rows = await db
    .select({ id: applications.id })
    .from(applications)
    .where(inArray(applications.jobId, recruiterJobs.map((j) => j.id)));
  return rows.length;
}

export async function countRecruiterShortlisted(recruiterId: string) {
  const db = getDb();
  const recruiterJobs = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.recruiterId, recruiterId));
  if (recruiterJobs.length === 0) return 0;
  const rows = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        inArray(applications.jobId, recruiterJobs.map((j) => j.id)),
        inArray(applications.status, ['shortlisted', 'hr_screen']),
      ),
    );
  return rows.length;
}

export async function listUnverifiedCompanies() {
  const db = getDb();
  const rows = await db.select().from(companies).where(eq(companies.verified, false)).orderBy(companies.name);
  return rows.map(mapCompany);
}

export async function listOpenJobReports() {
  const db = getDb();
  const rows = await db
    .select()
    .from(jobReports)
    .where(eq(jobReports.status, 'open'))
    .orderBy(desc(jobReports.createdAt));

  const out = [];
  for (const report of rows) {
    const jobRow = await one(
      db
        .select({ job: jobs, company: companies })
        .from(jobs)
        .innerJoin(companies, eq(jobs.companyId, companies.id))
        .where(eq(jobs.id, report.jobId)),
    );
    out.push({
      id: report.id,
      reason: report.reason,
      status: report.status,
      created_at: report.createdAt,
      job: jobRow ? mapJob(jobRow.job, mapCompany(jobRow.company)) : null,
    });
  }
  return out;
}

export async function getAdminTrustStats() {
  const db = getDb();
  const [allCompanies, allJobs, openReports] = await Promise.all([
    db.select().from(companies),
    db.select().from(jobs),
    db.select().from(jobReports).where(eq(jobReports.status, 'open')),
  ]);

  return {
    unverifiedCompanies: allCompanies.filter((c) => !c.verified).length,
    verifiedCompanies: allCompanies.filter((c) => c.verified).length,
    publishedJobs: allJobs.filter((j) => j.status === 'published').length,
    highRiskJobs: allJobs.filter((j) => j.scamRisk === 'high').length,
    openReports: openReports.length,
    totalJobs: allJobs.length,
  };
}
