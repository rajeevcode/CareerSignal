import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OnboardingInput = z.object({
  goal: z.string().min(1),
  cvText: z.string().min(50, "CV text is too short to analyze"),
  cvFileName: z.string().optional(),
  storagePath: z.string().optional(),
  targetRole: z.string().min(1),
  targetSeniority: z.string().optional(),
  markets: z.array(z.string()).min(1),
  workModes: z.array(z.string()).default([]),
  needsVisa: z.boolean().default(false),
  minSalary: z.number().int().nonnegative().optional(),
  salaryCurrency: z.string().default("EUR"),
  noticePeriod: z.string().optional(),
});

type ParsedCV = {
  fullName?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  experience: Array<{ title: string; company: string; years: string; bullets: string[] }>;
  education: Array<{ degree: string; school: string; year?: string }>;
};

type ScoreResult = {
  overall: number;
  sub_scores: Record<string, number>;
  strengths: string[];
  improvements: string[];
  summary: string;
};

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OnboardingInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { callGatewayJSON } = await import("./ai-gateway.server");

    // Enforce free-plan CV upload limit (3 total).
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_type, subscription_status")
      .eq("id", userId)
      .maybeSingle();
    const isPro = profile?.plan_type === "pro" && profile?.subscription_status === "active";
    if (!isPro) {
      const { count } = await supabase
        .from("cvs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) >= 3) {
        throw new Error("PAYWALL:upload_cv:You've used all 3 free CV uploads. Upgrade to Pro for unlimited CVs and role-specific versions.");
      }
    }


    // 1) AI parse + score in one call
    const ai = await callGatewayJSON<{ parsed: ParsedCV; score: ScoreResult }>({
      messages: [
        {
          role: "system",
          content:
            "You are a senior recruiter and ATS expert. Parse the CV and produce honest, actionable scoring. Avoid the words 'guaranteed' or 'beat ATS'. Use 'estimated' and 'signal'. Output STRICT JSON matching the schema. Scores are 0-100 integers.",
        },
        {
          role: "user",
          content: `Target role: ${data.targetRole}${data.targetSeniority ? ` (${data.targetSeniority})` : ""}.\n\nCV TEXT:\n${data.cvText}\n\nReturn JSON with this shape:\n{\n  "parsed": {\n    "fullName": string | null,\n    "headline": string | null,\n    "summary": string,\n    "skills": string[],\n    "experience": [{ "title": string, "company": string, "years": string, "bullets": string[] }],\n    "education": [{ "degree": string, "school": string, "year": string | null }]\n  },\n  "score": {\n    "overall": 0-100 integer,\n    "sub_scores": {\n      "clarity": 0-100,\n      "impact": 0-100,\n      "ats_fit": 0-100,\n      "keywords": 0-100,\n      "experience_depth": 0-100,\n      "skills_breadth": 0-100,\n      "role_alignment": 0-100,\n      "leadership_signal": 0-100\n    },\n    "strengths": string[] (4-6 items),\n    "improvements": string[] (4-6 items, each is a concrete next action),\n    "summary": string (2-3 sentences, candid)\n  }\n}`,
        },
      ],
    });

    // 2) Upsert profile basics
    await supabase
      .from("profiles")
      .update({
        full_name: ai.parsed.fullName ?? undefined,
        headline: ai.parsed.headline ?? undefined,
        target_role: data.targetRole,
        target_markets: data.markets,
      })
      .eq("id", userId);

    // 3) CV row
    const { data: cv, error: cvErr } = await supabase
      .from("cvs")
      .insert({ user_id: userId, name: "Primary CV", is_primary: true })
      .select("id")
      .single();
    if (cvErr) throw cvErr;

    // 4) CV version
    const { data: version, error: vErr } = await supabase
      .from("cv_versions")
      .insert({
        cv_id: cv.id,
        user_id: userId,
        version_number: 1,
        storage_path: data.storagePath ?? null,
        file_name: data.cvFileName ?? null,
        raw_text: data.cvText,
        parsed: ai.parsed as never,
      })
      .select("id")
      .single();
    if (vErr) throw vErr;

    // 5) CV Score
    await supabase.from("cv_scores").insert({
      cv_version_id: version.id,
      user_id: userId,
      overall: ai.score.overall,
      sub_scores: ai.score.sub_scores as never,
      strengths: ai.score.strengths as never,
      improvements: ai.score.improvements as never,
      summary: ai.score.summary,
    });

    // 6) Target role
    await supabase.from("target_roles").insert({
      user_id: userId,
      title: data.targetRole,
      seniority: data.targetSeniority ?? null,
      is_primary: true,
      fit_score: ai.score.sub_scores.role_alignment ?? null,
    });

    // 7) Preferences (upsert)
    await supabase.from("candidate_preferences").upsert({
      user_id: userId,
      goal: data.goal,
      markets: data.markets,
      work_modes: data.workModes,
      min_salary: data.minSalary ?? null,
      salary_currency: data.salaryCurrency,
      needs_visa: data.needsVisa,
      notice_period: data.noticePeriod ?? null,
      onboarding_completed: true,
    });

    // Recompute cv_upload_count from the live cvs rows (derived, not
    // incremented, so it can't drift). usage_limits is no longer writable by the
    // user's JWT (20260623000001_harden_rls_authz), so this goes through the
    // service-role admin client, scoped to the caller's own user_id.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count: cvCount } = await supabaseAdmin
      .from("cvs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    await supabaseAdmin
      .from("usage_limits")
      .upsert({ user_id: userId, cv_upload_count: cvCount ?? 0 });

    return { ok: true, overall: ai.score.overall };
  });


export const getOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("candidate_preferences")
      .select("onboarding_completed")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { completed: data?.onboarding_completed === true };
  });
