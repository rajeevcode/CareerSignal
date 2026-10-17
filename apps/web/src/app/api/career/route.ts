import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import {
  getDb,
  careerContacts,
  starStories,
  cvUploads,
  capturedJobs,
  jobs,
  companies,
  applications,
  cvVersions,
  toIsoNow,
} from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import {
  canonicalJobUrl,
  record,
  text,
  sourceSupportsExcerpt,
} from '@/lib/career-intelligence';
import { loadCareerWorkspace } from '@/lib/career-workspace';
import { FREE_LIMITS } from '@/lib/billing';
import { getUserPlan } from '@/lib/access';

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate)
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  return NextResponse.json(await loadCareerWorkspace(candidate.id));
}
export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate)
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  const body = record(await request.json().catch(() => null));
  const db = getDb();
  try {
    switch (body.action) {
      case 'capture': {
        const url = canonicalJobUrl(text(body, 'url', 2048, true)),
          title = text(body, 'title', 300, true),
          description = text(body, 'description', 50_000, true),
          company = text(body, 'company', 300, true),
          country = text(body, 'country', 100);
        const pro = (await getUserPlan(session.userId)) === 'pro';
        const result = await db.transaction(async (tx) => {
          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${candidate.id},0))`,
          );
          const existing = await tx
            .select({
              id: capturedJobs.id,
              jobId: capturedJobs.jobId,
              url: capturedJobs.canonicalUrl,
              title: jobs.title,
              description: jobs.description,
              company: companies.name,
            })
            .from(capturedJobs)
            .innerJoin(jobs, eq(jobs.id, capturedJobs.jobId))
            .innerJoin(companies, eq(companies.id, jobs.companyId))
            .where(eq(capturedJobs.candidateId, candidate.id));
          const duplicate = existing.find(
            (row) =>
              row.url === url ||
              (row.title.toLowerCase() === title.toLowerCase() &&
                row.description === description &&
                row.company.toLowerCase() === company.toLowerCase()),
          );
          if (duplicate) {
            const [app] = await tx
              .select({ id: applications.id })
              .from(applications)
              .where(
                and(
                  eq(applications.jobId, duplicate.jobId),
                  eq(applications.candidateId, candidate.id),
                ),
              );
            return { duplicate: true, applicationId: app?.id };
          }
          const [{ used }] = await tx
            .select({ used: sql<number>`count(*)::integer` })
            .from(applications)
            .where(eq(applications.candidateId, candidate.id));
          if (!pro && used >= FREE_LIMITS.trackedApplications)
            throw new Error('Tracked application limit reached');
          const now = toIsoNow();
          const [co] = await tx
            .insert(companies)
            .values({ name: company, capturedBy: candidate.id, createdAt: now })
            .returning({ id: companies.id });
          // Draft jobs captured by a candidate never appear in the public jobs feed.
          const [job] = await tx
            .insert(jobs)
            .values({
              companyId: co.id,
              capturedBy: candidate.id,
              title,
              description,
              sourceUrl: url,
              status: 'draft',
              postedAt: now,
              createdAt: now,
              updatedAt: now,
            })
            .returning({ id: jobs.id });
          await tx
            .insert(capturedJobs)
            .values({
              candidateId: candidate.id,
              jobId: job.id,
              canonicalUrl: url,
              country: country || null,
            });
          const [cv] = await tx
            .select({ id: cvVersions.id })
            .from(cvVersions)
            .where(
              and(
                eq(cvVersions.candidateId, candidate.id),
                eq(cvVersions.isPrimary, true),
              ),
            )
            .limit(1);
          const [upload] = await tx
            .select({ id: cvUploads.id })
            .from(cvUploads)
            .where(
              and(
                eq(cvUploads.candidateId, candidate.id),
                eq(cvUploads.isPrimary, true),
              ),
            )
            .limit(1);
          const [app] = await tx
            .insert(applications)
            .values({
              candidateId: candidate.id,
              jobId: job.id,
              status: 'saved',
              cvVersionId: cv?.id ?? upload?.id ?? null,
              appliedAt: now,
              updatedAt: now,
            })
            .returning({ id: applications.id });
          return { duplicate: false, applicationId: app.id };
        });
        return NextResponse.json(result);
      }
      case 'contact': {
        const next = text(body, 'nextContactAt', 40);
        if (next && !Number.isFinite(Date.parse(next)))
          throw new Error('Invalid follow-up date');
        const email = text(body, 'email', 320);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new Error('Invalid email');
        const applicationId = text(body, 'applicationId', 36);
        if (applicationId) {
          const [owned] = await db
            .select({ id: applications.id })
            .from(applications)
            .where(
              and(
                eq(applications.id, applicationId),
                eq(applications.candidateId, candidate.id),
              ),
            );
          if (!owned) throw new Error('Invalid application');
        }
        await db
          .insert(careerContacts)
          .values({
            applicationId: applicationId || null,
            candidateId: candidate.id,
            name: text(body, 'name', 200, true),
            email: email || null,
            company: text(body, 'company', 300) || null,
            notes: text(body, 'notes', 2000) || null,
            nextContactAt: next ? new Date(next).toISOString() : null,
          });
        break;
      }
      case 'story': {
        const sourceCvId = text(body, 'sourceCvId', 36, true),
          excerpt = text(body, 'sourceExcerpt', 3000, true);
        const [cv] = await db
          .select()
          .from(cvUploads)
          .where(
            and(
              eq(cvUploads.id, sourceCvId),
              eq(cvUploads.candidateId, candidate.id),
            ),
          )
          .limit(1);
        if (
          !cv ||
          !sourceSupportsExcerpt(cv.parsedText ?? '', excerpt) ||
          body.verified !== true
        )
          throw new Error(
            'Select your CV, quote at least 20 characters from it, and confirm the story is accurate.',
          );
        await db
          .insert(starStories)
          .values({
            candidateId: candidate.id,
            title: text(body, 'title', 300, true),
            situation: text(body, 'situation', 3000, true),
            task: text(body, 'task', 3000, true),
            action: text(body, 'storyAction', 3000, true),
            result: text(body, 'result', 3000, true),
            sourceCvId,
            sourceExcerpt: excerpt,
            candidateVerifiedAt: toIsoNow(),
            createdAt: toIsoNow(),
          });
        break;
      }
      case 'contact-complete': {
        const id = text(body, 'id', 36, true);
        await db
          .update(careerContacts)
          .set({ nextContactAt: null })
          .where(
            and(
              eq(careerContacts.id, id),
              eq(careerContacts.candidateId, candidate.id),
            ),
          );
        break;
      }
      case 'delete-contact':
      case 'delete-story': {
        const id = text(body, 'id', 36, true);
        const table =
          body.action === 'delete-contact' ? careerContacts : starStories;
        await db
          .delete(table)
          .where(and(eq(table.id, id), eq(table.candidateId, candidate.id)));
        break;
      }
      default:
        throw new Error('Unknown action');
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save';
    const safe =
      /^(Invalid|Use |Select your|Tracked application|Unknown action)/.test(
        message,
      )
        ? message
        : 'Unable to save. Please try again.';
    return NextResponse.json(
      { error: safe },
      { status: safe.startsWith('Tracked') ? 402 : 400 },
    );
  }
}
