import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CvVersion = {
  id: string;
  cv_id: string;
  version_number: number;
  file_name: string | null;
  raw_text: string | null;
  note: string | null;
  source: string;
  created_at: string;
};

async function getPrimaryCvId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("cvs")
    .select("id")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No primary CV. Complete onboarding first.");
  return data.id;
}

export const listCvVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CvVersion[]> => {
    const cvId = await getPrimaryCvId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("cv_versions")
      .select("id, cv_id, version_number, file_name, raw_text, note, source, created_at")
      .eq("cv_id", cvId)
      .eq("user_id", context.userId)
      .order("version_number", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CvVersion[];
  });

const GetInput = z.object({ id: z.string().uuid() });
export const getCvVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GetInput.parse(input))
  .handler(async ({ data, context }): Promise<CvVersion> => {
    const { data: row, error } = await context.supabase
      .from("cv_versions")
      .select("id, cv_id, version_number, file_name, raw_text, note, source, created_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error) throw error;
    return row as CvVersion;
  });

const ApplyInput = z.object({
  analysisId: z.string().uuid(),
  selectedIndexes: z.array(z.number().int().min(0)),
  appendSuggested: z.boolean().default(false),
  note: z.string().optional(),
});

export const applyRewritesAsNewVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApplyInput.parse(input))
  .handler(async ({ data, context }): Promise<CvVersion> => {
    const { supabase, userId } = context;

    const { data: analysis, error: aErr } = await supabase
      .from("cv_analyses")
      .select("id, cv_version_id, bullet_feedback, suggested_bullets")
      .eq("id", data.analysisId)
      .eq("user_id", userId)
      .single();
    if (aErr || !analysis) throw new Error("Analysis not found");

    const { data: base, error: bErr } = await supabase
      .from("cv_versions")
      .select("id, cv_id, raw_text, parsed, file_name, version_number")
      .eq("id", analysis.cv_version_id)
      .eq("user_id", userId)
      .single();
    if (bErr || !base) throw new Error("Base CV version not found");

    let text = base.raw_text ?? "";
    const rewrites = (analysis.bullet_feedback as Array<{ original: string; rewrite: string }>) ?? [];
    const applied: string[] = [];
    for (const i of data.selectedIndexes) {
      const r = rewrites[i];
      if (!r) continue;
      // Simple text replacement; if not found, append as suggested addition
      if (text.includes(r.original)) {
        text = text.replace(r.original, r.rewrite);
        applied.push(r.rewrite);
      } else {
        text += `\n• ${r.rewrite}`;
        applied.push(r.rewrite);
      }
    }
    if (data.appendSuggested) {
      const suggested = (analysis.suggested_bullets as string[]) ?? [];
      if (suggested.length) {
        text += "\n\n" + suggested.map((s) => `• ${s}`).join("\n");
      }
    }

    // Get next version_number
    const { data: maxRow } = await supabase
      .from("cv_versions")
      .select("version_number")
      .eq("cv_id", base.cv_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (maxRow?.version_number ?? 0) + 1;

    const noteLabel =
      data.note ??
      `AI rewrites (${applied.length} bullet${applied.length === 1 ? "" : "s"})${data.appendSuggested ? " + suggestions" : ""}`;

    const { data: inserted, error: iErr } = await supabase
      .from("cv_versions")
      .insert({
        cv_id: base.cv_id,
        user_id: userId,
        version_number: nextVersion,
        file_name: base.file_name,
        raw_text: text,
        parsed: base.parsed as never,
        note: noteLabel,
        source: "ai_rewrite",
      })
      .select("id, cv_id, version_number, file_name, raw_text, note, source, created_at")
      .single();
    if (iErr) throw iErr;
    return inserted as CvVersion;
  });

const DelInput = z.object({ id: z.string().uuid() });
export const deleteCvVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DelInput.parse(input))
  .handler(async ({ data, context }) => {
    // Don't allow deleting the only version
    const { data: row } = await context.supabase
      .from("cv_versions")
      .select("cv_id")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (!row) throw new Error("Version not found");
    const { count } = await context.supabase
      .from("cv_versions")
      .select("*", { count: "exact", head: true })
      .eq("cv_id", row.cv_id)
      .eq("user_id", context.userId);
    if ((count ?? 0) <= 1) throw new Error("Cannot delete the only version.");
    const { error } = await context.supabase
      .from("cv_versions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
