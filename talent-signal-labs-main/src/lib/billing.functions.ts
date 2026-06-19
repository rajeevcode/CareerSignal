import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_LIMITS, type PlanType, type UsageState } from "./billing";

type UsageRow = {
  cv_upload_count: number;
  jd_match_count_monthly: number;
  saved_jobs_count: number;
  tracked_applications_count: number;
  current_month: string;
};

function monthKey() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

async function ensureUsage(supabase: any, userId: string): Promise<UsageRow> {
  const { data, error } = await supabase
    .from("usage_limits")
    .select("cv_upload_count, jd_match_count_monthly, saved_jobs_count, tracked_applications_count, current_month")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const m = monthKey();
  if (!data) {
    const { data: inserted, error: e2 } = await supabase
      .from("usage_limits")
      .insert({ user_id: userId, current_month: m })
      .select("cv_upload_count, jd_match_count_monthly, saved_jobs_count, tracked_applications_count, current_month")
      .single();
    if (e2) throw e2;
    return inserted as UsageRow;
  }
  // Roll over monthly counters
  if (data.current_month !== m) {
    const { data: updated, error: e3 } = await supabase
      .from("usage_limits")
      .update({ jd_match_count_monthly: 0, current_month: m })
      .eq("user_id", userId)
      .select("cv_upload_count, jd_match_count_monthly, saved_jobs_count, tracked_applications_count, current_month")
      .single();
    if (e3) throw e3;
    return updated as UsageRow;
  }
  return data as UsageRow;
}

export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ plan: PlanType; usage: UsageState; email: string | null }> => {
    const { supabase, userId, claims } = context;
    const usage = await ensureUsage(supabase, userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_type, subscription_status")
      .eq("id", userId)
      .maybeSingle();
    const plan: PlanType =
      profile?.plan_type === "pro" && profile?.subscription_status === "active" ? "pro" : "free";
    return { plan, usage, email: (claims as any)?.email ?? null };
  });

const incSchema = z.object({
  kind: z.enum(["cv_upload", "jd_match", "saved_job", "tracked_application"]),
  delta: z.number().int().min(-1).max(1).default(1),
});

export const incrementUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => incSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const usage = await ensureUsage(supabase, userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_type, subscription_status")
      .eq("id", userId)
      .maybeSingle();
    const isPro =
      profile?.plan_type === "pro" && profile?.subscription_status === "active";

    const next = { ...usage };
    if (data.kind === "cv_upload") next.cv_upload_count += data.delta;
    if (data.kind === "jd_match") next.jd_match_count_monthly += data.delta;
    if (data.kind === "saved_job") next.saved_jobs_count += data.delta;
    if (data.kind === "tracked_application") next.tracked_applications_count += data.delta;
    next.cv_upload_count = Math.max(0, next.cv_upload_count);
    next.jd_match_count_monthly = Math.max(0, next.jd_match_count_monthly);
    next.saved_jobs_count = Math.max(0, next.saved_jobs_count);
    next.tracked_applications_count = Math.max(0, next.tracked_applications_count);

    if (!isPro && data.delta > 0) {
      const limits = FREE_LIMITS;
      if (data.kind === "cv_upload" && next.cv_upload_count > limits.cvUploads)
        throw new Error(`PAYWALL:upload_cv:You've used all ${limits.cvUploads} free CV uploads. Upgrade to Pro for unlimited.`);
      if (data.kind === "jd_match" && next.jd_match_count_monthly > limits.jdMatchesMonthly)
        throw new Error(`PAYWALL:jd_match:You've used your ${limits.jdMatchesMonthly} free JD matches this month.`);
      if (data.kind === "saved_job" && next.saved_jobs_count > limits.savedJobs)
        throw new Error(`PAYWALL:save_job:Free plan saves up to ${limits.savedJobs} jobs.`);
      if (data.kind === "tracked_application" && next.tracked_applications_count > limits.trackedApplications)
        throw new Error(`PAYWALL:track_application:Free plan tracks up to ${limits.trackedApplications} applications.`);
    }

    const { error } = await supabase
      .from("usage_limits")
      .update({
        cv_upload_count: next.cv_upload_count,
        jd_match_count_monthly: next.jd_match_count_monthly,
        saved_jobs_count: next.saved_jobs_count,
        tracked_applications_count: next.tracked_applications_count,
      })
      .eq("user_id", userId);
    if (error) throw error;
    return { usage: next, plan: (isPro ? "pro" : "free") as PlanType };
  });

// DEV / placeholder: mark current user as Pro. Replace with Stripe webhook later.
export const activateProPlaceholder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const { error } = await supabase
      .from("profiles")
      .update({
        plan_type: "pro",
        subscription_status: "active",
        subscription_provider: "placeholder",
        current_period_end: periodEnd.toISOString(),
      })
      .eq("id", userId);
    if (error) throw error;
    return { ok: true, current_period_end: periodEnd.toISOString() };
  });

export const cancelProPlaceholder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ plan_type: "free", subscription_status: "cancelled" })
      .eq("id", userId);
    if (error) throw error;
    return { ok: true };
  });
