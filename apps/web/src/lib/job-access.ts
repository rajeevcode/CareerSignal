import 'server-only';
import { and, eq, isNull, or } from 'drizzle-orm';
import { getDb, jobs } from '@careersignal/db';

/** Privileged connections must enforce job visibility before any AI work. */
export async function canAccessJob(
  candidateId: string,
  jobId: unknown,
): Promise<boolean> {
  if (
    typeof jobId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      jobId,
    )
  )
    return false;
  const [job] = await getDb()
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        eq(jobs.id, jobId),
        or(
          and(isNull(jobs.capturedBy), eq(jobs.status, 'published')),
          eq(jobs.capturedBy, candidateId),
        ),
      ),
    )
    .limit(1);
  return Boolean(job);
}
