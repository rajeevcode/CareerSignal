import 'server-only';
import { and, eq, desc } from 'drizzle-orm';
import {
  getDb,
  capturedJobs,
  jobs,
  companies,
  careerContacts,
  starStories,
  applicationEvents,
  applicationSnapshots,
  jdAnalyses,
  cvUploads,
  careerConnections,
  careerIntegrationItems,
  applications,
  careerNotifications,
} from '@careersignal/db';
import { listApplications } from '@/lib/queries';
import {
  empiricalCalibration,
  outcomeCohorts,
  interviewStages,
  record,
} from '@/lib/career-intelligence';

export async function loadCareerWorkspace(candidateId: string) {
  const db = getDb();
  const [
    captured,
    contacts,
    stories,
    events,
    snapshots,
    analyses,
    cvs,
    connections,
    items,
    apps,
    notifications,
  ] = await Promise.all([
    db
      .select({
        id: capturedJobs.id,
        jobId: capturedJobs.jobId,
        title: jobs.title,
        company: companies.name,
        url: capturedJobs.canonicalUrl,
        country: capturedJobs.country,
      })
      .from(capturedJobs)
      .innerJoin(jobs, eq(capturedJobs.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(capturedJobs.candidateId, candidateId)),
    db
      .select()
      .from(careerContacts)
      .where(eq(careerContacts.candidateId, candidateId))
      .orderBy(desc(careerContacts.createdAt)),
    db
      .select()
      .from(starStories)
      .where(eq(starStories.candidateId, candidateId))
      .orderBy(desc(starStories.createdAt)),
    db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.candidateId, candidateId))
      .orderBy(desc(applicationEvents.createdAt)),
    db
      .select()
      .from(applicationSnapshots)
      .where(eq(applicationSnapshots.candidateId, candidateId)),
    db
      .select()
      .from(jdAnalyses)
      .where(eq(jdAnalyses.candidateId, candidateId))
      .orderBy(desc(jdAnalyses.createdAt))
      .limit(50),
    db
      .select({
        id: cvUploads.id,
        name: cvUploads.fileName,
        text: cvUploads.parsedText,
      })
      .from(cvUploads)
      .where(eq(cvUploads.candidateId, candidateId)),
    db
      .select({
        id: careerConnections.id,
        kind: careerConnections.kind,
        lastSyncedAt: careerConnections.lastSyncedAt,
        scopes: careerConnections.scopes,
      })
      .from(careerConnections)
      .where(eq(careerConnections.candidateId, candidateId)),
    db
      .select()
      .from(careerIntegrationItems)
      .where(eq(careerIntegrationItems.candidateId, candidateId))
      .orderBy(desc(careerIntegrationItems.createdAt))
      .limit(100),
    listApplications(candidateId),
    db
      .select({
        id: careerNotifications.id,
        applicationId: careerNotifications.applicationId,
        dueAt: careerNotifications.dueAt,
      })
      .from(careerNotifications)
      .innerJoin(
        applications,
        and(
          eq(applications.id, careerNotifications.applicationId),
          eq(applications.followUpDueAt, careerNotifications.dueAt),
        ),
      )
      .where(
        and(
          eq(careerNotifications.candidateId, candidateId),
          eq(applications.candidateId, candidateId),
        ),
      ),
  ]);
  const snapshotsByApplication = new Map(
    snapshots.map((s) => [s.applicationId, s]),
  );
  const interviewedApps = new Set(
    events
      .filter((e) => e.kind !== 'baseline' && interviewStages.has(e.toStatus))
      .map((e) => e.applicationId),
  );
  const completeHistory = new Set(
    events.filter((e) => e.kind === 'created').map((e) => e.applicationId),
  );
  const observations = apps.map((app) => {
    const snap = snapshotsByApplication.get(app.id),
      cv = record(snap?.cvJson);
    return {
      id: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      score: app.interviewProbability,
      country: snap?.country ?? null,
      source: snap?.sourceHost ?? null,
      cv:
        typeof cv.id === 'string'
          ? `${typeof cv.name === 'string' ? cv.name : 'CV'} · ${cv.id}`
          : null,
      historyComplete:
        Boolean(snap && snap.scoringVersion === 'heuristic-fit-v2') &&
        completeHistory.has(app.id),
      historicalInterview: interviewedApps.has(app.id),
    };
  });
  const history = analyses.map((row) => {
    const evidence = record(record(row.gapJson).evidence);
    return {
      id: row.id,
      title: row.jobTitle,
      score: row.interviewSignal,
      jdScore: row.jdMatchScore,
      createdAt: row.createdAt,
      version:
        typeof evidence.scoring_version === 'string'
          ? evidence.scoring_version
          : 'Unknown',
      jobFingerprint:
        typeof evidence.job_fingerprint === 'string'
          ? evidence.job_fingerprint
          : null,
      cvFingerprint:
        typeof evidence.cv_fingerprint === 'string'
          ? evidence.cv_fingerprint
          : null,
    };
  });
  return {
    captured,
    contacts,
    stories,
    history,
    cvs,
    connections,
    items,
    notifications,
    applications: apps.map((a) => ({
      id: a.id,
      status: a.status,
      jobId: a.jobId,
    })),
    cohorts: {
      country: outcomeCohorts(observations, 'country'),
      source: outcomeCohorts(observations, 'source'),
      cv: outcomeCohorts(observations, 'cv'),
    },
    calibration: empiricalCalibration(observations),
    googleConfigured: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.CAREER_TOKEN_ENCRYPTION_KEY &&
        process.env.GOOGLE_REDIRECT_URI,
    ),
  };
}
export type CareerWorkspaceData = Awaited<
  ReturnType<typeof loadCareerWorkspace>
>;
