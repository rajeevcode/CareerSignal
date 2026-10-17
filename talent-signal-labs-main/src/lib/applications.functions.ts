import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Recompute usage_limits counters from the live applications rows. Derived (not
// incremented/decremented) so counters can never drift out of sync with reality
// across save / status-change / delete / de-dupe. Written via the service-role
// client because usage_limits is no longer writable by the user's JWT
// (20260623000001_harden_rls_authz).
async function syncUsageCounters(userId: string): Promise<void> {
  const admin = await getAdmin();
  const [{ count: savedCount }, { count: totalCount }] = await Promise.all([
    admin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "saved"),
    admin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  await admin.from("usage_limits").upsert({
    user_id: userId,
    saved_jobs_count: savedCount ?? 0,
    tracked_applications_count: totalCount ?? 0,
  });
}

export const PIPELINE_STATUSES = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export type PipelineApplication = {
  id: string;
  status: PipelineStatus;
  match_score: number | null;
  notes: string | null;
  applied_at: string | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
  job_id: string | null;
  job_title: string | null;
  job_location: string | null;
  company: string | null;
};

function normalizeStatus(s: string | null | undefined): PipelineStatus {
  return (PIPELINE_STATUSES as readonly string[]).includes(s ?? "")
    ? (s as PipelineStatus)
    : "saved";
}

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PipelineApplication[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("applications")
      .select(
        "id, status, match_score, notes, applied_at, next_action_at, created_at, updated_at, job_id, jobs(title, location, companies(name))",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((a) => {
      const job = a.jobs as
        | { title?: string | null; location?: string | null; companies?: { name?: string | null } | null }
        | null;
      return {
        id: a.id,
        status: normalizeStatus(a.status),
        match_score: a.match_score,
        notes: a.notes,
        applied_at: a.applied_at,
        next_action_at: a.next_action_at,
        created_at: a.created_at,
        updated_at: a.updated_at,
        job_id: a.job_id,
        job_title: job?.title ?? null,
        job_location: job?.location ?? null,
        company: job?.companies?.name ?? null,
      };
    });
  });

const saveJobSchema = z.object({
  job_id: z.string().uuid(),
  match_score: z.number().int().min(0).max(100).nullable().optional(),
});

export const saveJobToPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveJobSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Don't duplicate: return existing application for this job if present.
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .eq("job_id", data.job_id)
      .maybeSingle();
    if (existing) return { id: existing.id, created: false };

    // Enforce Free plan limits: max 5 saved + 10 tracked applications.
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_type, subscription_status")
      .eq("id", userId)
      .maybeSingle();
    const isPro = profile?.plan_type === "pro" && profile?.subscription_status === "active";
    if (!isPro) {
      // The binding cap is the TOTAL number of tracked applications (every saved
      // job is one application row). Gating on this — not on the count of rows
      // still in `status='saved'` — closes the bypass where advancing an
      // application off "saved" frees a slot and lets a Free user save without
      // limit. The 5-saved figure is a sub-limit on jobs not yet acted on.
      const { count: totalCount } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((totalCount ?? 0) >= 10) {
        throw new Error("PAYWALL:track_application:You're tracking 10 applications — the Free plan limit. Upgrade to Pro for unlimited.");
      }
      const { count: savedCount } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "saved");
      if ((savedCount ?? 0) >= 5) {
        throw new Error("PAYWALL:save_job:You have 5 un-acted jobs saved on the Free plan. Apply to or remove some, or upgrade to Pro to save unlimited jobs.");
      }
    }

    const { data: inserted, error } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        job_id: data.job_id,
        status: "saved",
        match_score: data.match_score ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;

    await syncUsageCounters(userId);

    return { id: inserted.id, created: true };
  });


const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(PIPELINE_STATUSES),
});

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateStatusSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const patch: { status: PipelineStatus; applied_at?: string } = { status: data.status };
    if (data.status === "applied") patch.applied_at = new Date().toISOString();
    const { error } = await supabase
      .from("applications")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    // Moving a row in/out of "saved" changes saved_jobs_count.
    await syncUsageCounters(userId);
    return { ok: true };
  });

const deleteSchema = z.object({ id: z.string().uuid() });
export const deleteApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    // Free the slot in the displayed quota (fixes counter drift on delete).
    await syncUsageCounters(userId);
    return { ok: true };
  });
