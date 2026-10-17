import 'server-only';
import { eq, count, sql, and } from 'drizzle-orm';
import {
  getDb,
  subscriptions,
  usageLimits,
  candidateProfiles,
  savedJobs,
  cvUploads,
  applications,
  toIsoNow,
} from '@careersignal/db';
import type { SessionPayload } from '@/lib/auth/token';
import {
  canUseFeature,
  FREE_LIMITS,
  type FeatureKey,
  type GateResult,
  type PlanState,
  type PlanType,
  type UsageState,
} from '@/lib/billing';

export type Tier = 'guest' | 'free' | 'pro';

export function currentMonth(): string {
  // YYYY-MM in UTC; lazy monthly reset key for JD match quota.
  return new Date().toISOString().slice(0, 7);
}

async function one<T>(query: Promise<T[]>): Promise<T | null> {
  const rows = await query;
  return rows[0] ?? null;
}

/**
 * Source of truth for "is this user Pro?" = DB (subscriptions). A row only
 * counts as Pro when plan='pro' AND status='active' — a cancelled/past_due
 * subscription still has plan='pro' until the period ends, so checking plan
 * alone would keep granting Pro features after the subscription lapses. This is
 * the single definition; isProUser in services/billing defers to it.
 */
export async function getUserPlan(userId: string): Promise<PlanType> {
  const db = getDb();
  const row = await one(
    db
      .select({ plan: subscriptions.plan, status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId)),
  );
  return row?.plan === 'pro' && row?.status === 'active' ? 'pro' : 'free';
}

export async function getTier(session: SessionPayload | null): Promise<Tier> {
  if (!session) return 'guest';
  return getUserPlan(session.userId);
}

async function countRows(
  table: typeof savedJobs | typeof cvUploads | typeof applications,
  candidateId: string,
): Promise<number> {
  // COUNT(*) aggregate — don't materialize every row just to read .length.
  const [row] = await getDb()
    .select({ value: count() })
    .from(table)
    .where(eq(table.candidateId, candidateId));
  return row?.value ?? 0;
}

/** Build the freemium PlanState for a user (live counts + monthly JD counter from usage_limits). */
export async function getPlanStateForUser(userId: string): Promise<PlanState> {
  const db = getDb();
  const [plan, candidate, usage] = await Promise.all([
    getUserPlan(userId),
    one(db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId))),
    one(db.select().from(usageLimits).where(eq(usageLimits.userId, userId))),
  ]);
  const month = currentMonth();

  // Run the three live counts in parallel rather than serially awaiting each.
  const [cvUploadCount, savedJobsCount, trackedApplicationsCount] = candidate
    ? await Promise.all([
        countRows(cvUploads, candidate.id),
        countRows(savedJobs, candidate.id),
        countRows(applications, candidate.id),
      ])
    : [0, 0, 0];

  const usageState: UsageState = {
    cv_upload_count: cvUploadCount,
    saved_jobs_count: savedJobsCount,
    tracked_applications_count: trackedApplicationsCount,
    jd_match_count_monthly: usage && usage.currentMonth === month ? usage.jdMatchCountMonthly : 0,
    current_month: month,
  };

  return { plan, usage: usageState };
}

export function gate(planState: PlanState, feature: FeatureKey): GateResult {
  return canUseFeature(planState, feature);
}

/** Reserve capacity atomically before starting expensive work. No lock spans the AI call. */
export async function reserveJdMatch(userId: string): Promise<string | null> {
  const month = currentMonth();
  const used = sql<number>`case when ${usageLimits.currentMonth} = ${month}
    then ${usageLimits.jdMatchCountMonthly} else 0 end`;
  const rows = await getDb().insert(usageLimits).values({
    userId, jdMatchCountMonthly: 1, currentMonth: month,
    createdAt: toIsoNow(), updatedAt: toIsoNow(),
  }).onConflictDoUpdate({
    target: usageLimits.userId,
    set: { jdMatchCountMonthly: sql`${used} + 1`, currentMonth: month, updatedAt: toIsoNow() },
    setWhere: sql`${used} < ${FREE_LIMITS.jdMatchesMonthly}`,
  }).returning({ id: usageLimits.id });
  return rows.length ? month : null;
}

/** Refund only the reservation's month; never decrement a newly reset month's counter. */
export async function releaseJdMatch(userId: string, month: string): Promise<void> {
  await getDb().update(usageLimits).set({
    jdMatchCountMonthly: sql`greatest(0, ${usageLimits.jdMatchCountMonthly} - 1)`,
    updatedAt: toIsoNow(),
  }).where(and(eq(usageLimits.userId, userId), eq(usageLimits.currentMonth, month)));
}

/** Standard 402 paywall response body. */
export function paywallBody(result: Extract<GateResult, { allowed: false }>) {
  return { error: result.reason, upgrade: true, feature: result.feature };
}

/** Plain helper to read just the plan (server pages). */
export async function getUserPlanForSession(session: SessionPayload | null): Promise<PlanType> {
  if (!session) return 'free';
  return getUserPlan(session.userId);
}
