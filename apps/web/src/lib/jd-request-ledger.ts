import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, jdRequests, usageLimits, toIsoNow } from '@careersignal/db';
import { FREE_LIMITS } from '@/lib/billing';

type Start =
  | { kind: 'started'; id: string }
  | { kind: 'cached'; data: unknown }
  | { kind: 'pending' | 'conflict' | 'denied' | 'failed' };
export async function beginJdRequest(
  userId: string,
  candidateId: string,
  key: string,
  body: unknown,
  pro: boolean,
): Promise<Start> {
  const bodyHash = createHash('sha256')
    .update(JSON.stringify(body))
    .digest('hex');
  return getDb().transaction(async (tx) => {
    const [created] = await tx
      .insert(jdRequests)
      .values({
        userId,
        candidateId,
        requestKey: key,
        bodyHash,
        status: 'processing',
        leaseExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      })
      .onConflictDoNothing()
      .returning();
    if (!created) {
      const [existing] = await tx
        .select()
        .from(jdRequests)
        .where(
          and(eq(jdRequests.userId, userId), eq(jdRequests.requestKey, key)),
        );
      if (!existing || existing.bodyHash !== bodyHash)
        return { kind: 'conflict' };
      if (existing.status === 'succeeded')
        return { kind: 'cached', data: existing.responseJson };
      return { kind: existing.status === 'processing' ? 'pending' : 'failed' };
    }
    if (!pro) {
      const month = new Date().toISOString().slice(0, 7);
      const used = sql<number>`case when ${usageLimits.currentMonth}=${month} then ${usageLimits.jdMatchCountMonthly} else 0 end`;
      const reserved = await tx
        .insert(usageLimits)
        .values({
          userId,
          jdMatchCountMonthly: 1,
          currentMonth: month,
          createdAt: toIsoNow(),
          updatedAt: toIsoNow(),
        })
        .onConflictDoUpdate({
          target: usageLimits.userId,
          set: {
            jdMatchCountMonthly: sql`${used}+1`,
            currentMonth: month,
            updatedAt: toIsoNow(),
          },
          setWhere: sql`${used}<${FREE_LIMITS.jdMatchesMonthly}`,
        })
        .returning({ id: usageLimits.id });
      if (!reserved.length) {
        await tx
          .update(jdRequests)
          .set({ status: 'failed' })
          .where(eq(jdRequests.id, created.id));
        return { kind: 'denied' };
      }
      await tx
        .update(jdRequests)
        .set({ reservedMonth: month })
        .where(eq(jdRequests.id, created.id));
    }
    return { kind: 'started', id: created.id };
  });
}
export async function finishJdRequest(
  id: string,
  success: boolean,
  data: unknown = null,
): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(jdRequests)
      .where(eq(jdRequests.id, id))
      .for('update');
    if (!row || row.status !== 'processing') return false;
    if (!success && row.reservedMonth)
      await tx
        .update(usageLimits)
        .set({
          jdMatchCountMonthly: sql`greatest(0,${usageLimits.jdMatchCountMonthly}-1)`,
          updatedAt: toIsoNow(),
        })
        .where(
          and(
            eq(usageLimits.userId, row.userId),
            eq(usageLimits.currentMonth, row.reservedMonth),
          ),
        );
    await tx
      .update(jdRequests)
      .set({
        status: success ? 'succeeded' : 'failed',
        responseJson: success ? data : null,
      })
      .where(eq(jdRequests.id, id));
    return true;
  });
}
