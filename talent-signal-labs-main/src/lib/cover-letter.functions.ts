import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CoverLetter = {
  id: string;
  application_id: string | null;
  job_id: string | null;
  cv_version_id: string | null;
  content: string;
  tone: string | null;
  created_at: string;
  updated_at: string;
};

const GenInput = z.object({
  applicationId: z.string().uuid().optional(),
  jdText: z.string().min(40).optional(),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  tone: z.enum(["concise", "warm", "formal", "enthusiastic"]).default("warm"),
});

export const generateCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenInput.parse(input))
  .handler(async ({ data, context }): Promise<CoverLetter> => {
    const { supabase, userId } = context;

    let jdText = data.jdText ?? "";
    let jobTitle = data.jobTitle ?? "";
    let companyName = data.companyName ?? "";
    let jobId: string | null = null;

    if (data.applicationId) {
      const { data: app } = await supabase
        .from("applications")
        .select("id, job_id, jobs(title, description, companies(name))")
        .eq("id", data.applicationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (app?.jobs) {
        const j = app.jobs as { title?: string; description?: string; companies?: { name?: string } | null };
        jobTitle = jobTitle || j.title || "";
        companyName = companyName || j.companies?.name || "";
        jdText = jdText || j.description || "";
        jobId = app.job_id;
      }
    }
    if (!jdText && !jobTitle) throw new Error("Provide a job description or title.");

    // Pull primary CV
    const { data: primary } = await supabase
      .from("cvs")
      .select("id")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    let cvText = "";
    let cvVersionId: string | null = null;
    if (primary) {
      const { data: v } = await supabase
        .from("cv_versions")
        .select("id, raw_text, parsed")
        .eq("cv_id", primary.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (v) {
        cvVersionId = v.id;
        cvText = v.raw_text ?? JSON.stringify(v.parsed ?? {});
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const { callGatewayJSON } = await import("./ai-gateway.server");
    const ai = await callGatewayJSON<{ content: string }>({
      messages: [
        {
          role: "system",
          content:
            "You are an expert career writer. Write a tailored cover letter ~280-360 words. Open with a specific hook tied to the company. Use concrete achievements from the CV with numbers when available. No clichés ('hardworking team player'). End with a clear call to action. Output STRICT JSON: {\"content\": string}.",
        },
        {
          role: "user",
          content: `Tone: ${data.tone}. Candidate name: ${profile?.full_name ?? "the candidate"}.\n\nROLE: ${jobTitle}${companyName ? ` at ${companyName}` : ""}\n\nJOB DESCRIPTION:\n${jdText.slice(0, 6000)}\n\nCV:\n${cvText.slice(0, 6000)}`,
        },
      ],
      temperature: 0.6,
    });

    const { data: row, error } = await supabase
      .from("cover_letters")
      .insert({
        user_id: userId,
        application_id: data.applicationId ?? null,
        job_id: jobId,
        cv_version_id: cvVersionId,
        content: ai.content,
        tone: data.tone,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row as CoverLetter;
  });

export const listCoverLetters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CoverLetter[]> => {
    const { data, error } = await context.supabase
      .from("cover_letters")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as CoverLetter[];
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cover_letters")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
