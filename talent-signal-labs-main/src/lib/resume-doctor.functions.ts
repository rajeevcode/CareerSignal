import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Types ----------

export type ScoreImpact = {
  jd_match: number;        // +N
  ats_keyword: number;     // +N
  recruiter_scan: number;  // +N
};

export type BulletFeedback = {
  original: string;
  rewrite: string;
  /** Plain-English diagnosis of why the original is weak. */
  issue: string;
  /** Why the rewrite is stronger. */
  reason: string;
  /** New / reinforced keywords surfaced by the rewrite. */
  keywords_added: string[];
  /** Estimated score lift if user accepts this rewrite. */
  score_impact: ScoreImpact;
  /** True if the rewrite contains [bracketed] metric placeholders the user must fill in. */
  has_placeholders: boolean;
  /** 0-100 confidence in the original bullet's current strength. */
  strength: number;
};

export type CvAnalysisRow = {
  id: string;
  cv_version_id: string;
  target_job_id: string | null;
  target_jd_text: string | null;
  match_score: number | null;
  /** Projected JD match if all rewrites accepted. */
  potential_match_score?: number;
  ats_keyword_match?: number;
  scores: Record<string, number>;
  bullet_feedback: BulletFeedback[];
  missing_keywords: string[];
  matched_keywords: string[];
  suggested_bullets: string[];
  summary: string | null;
  /** AI-generated FAANG-quality professional summary block. */
  suggested_summary?: string;
  /** Style preset used for this analysis. */
  role_style?: RoleStyle;
  created_at: string;
};

export const ROLE_STYLES = [
  "ai-pm",
  "tech-pm",
  "data-pm",
  "product-owner",
  "growth-pm",
  "program-manager",
] as const;
export type RoleStyle = (typeof ROLE_STYLES)[number];

const ROLE_STYLE_GUIDE: Record<RoleStyle, string> = {
  "ai-pm":
    "AI Product Manager. Emphasize LLM/agent workflows, evals, model selection, data pipelines, AI safety, latency/cost tradeoffs, prompt systems, automation, signal volume. Keywords: LLM, agent, eval, RAG, AI workflow, automation, classification, dashboard, prioritization, model performance.",
  "tech-pm":
    "Technical Product Manager. Emphasize platform/API ownership, SQL, data models, system design tradeoffs, SLA/SLO, integrations, infra reliability, dev experience. Keywords: API, platform, SQL, schema, SLA, latency, throughput, integration, observability.",
  "data-pm":
    "Data Product Manager. Emphasize data platforms, analytics products, experimentation, governance, data quality, dashboard consolidation, decisioning. Keywords: data platform, analytics, experimentation, A/B, dashboard, governance, data quality, decisioning, SQL, KPI.",
  "product-owner":
    "Product Owner. Emphasize backlog ownership, sprint outcomes, acceptance criteria, stakeholder alignment, predictable delivery. Keywords: backlog, sprint, acceptance criteria, stakeholder, release, roadmap, velocity, predictability.",
  "growth-pm":
    "Growth PM. Emphasize activation, retention, funnel, conversion, experimentation, north-star metric, LTV/CAC. Keywords: activation, retention, conversion, funnel, experiment, north-star, LTV, CAC, cohort.",
  "program-manager":
    "Program Manager. Emphasize cross-team coordination, dependency management, risk burn-down, milestone delivery, governance. Keywords: cross-functional, dependency, milestone, risk, governance, RAID, status, executive reporting.",
};

// ---------- Analyze ----------

const AnalyzeInput = z.object({
  cvVersionId: z.string().uuid().optional(),
  jdText: z.string().optional(),
  targetRole: z.string().optional(),
  roleStyle: z.enum(ROLE_STYLES).optional(),
});

type AiPayload = {
  match_score: number;
  potential_match_score: number;
  ats_keyword_match: number;
  scores: {
    impact: number;
    brevity: number;
    style: number;
    ats_fit: number;
    skills_match: number;
    clarity: number;
  };
  bullet_feedback: BulletFeedback[];
  missing_keywords: string[];
  matched_keywords: string[];
  suggested_bullets: string[];
  summary: string;
  suggested_summary: string;
};

const FAANG_BULLET_RULES = `
You write FAANG-grade, recruiter-ready CV bullets.

Every rewrite MUST follow the X-Y-Z impact formula:
  "Accomplished X, measured by Y, by doing Z."
OR:
  "Drove [business/user outcome] by [metric], through [specific product/action/system]."

Each rewrite MUST contain ALL of:
  1. Strong action verb (Led, Built, Shipped, Drove, Reduced, Increased, Owned, Launched, Scaled, Automated).
  2. Specific ownership / scope.
  3. Measurable outcome — business, user, revenue, efficiency, quality, or operational metric.
  4. Mechanism — the product, system, or action that produced the outcome.
  5. 2-5 role-relevant keywords woven naturally.
  6. Seniority signal proportional to the candidate's level.

Hard rules:
  - NEVER fabricate numbers. If the original bullet has no metric, insert a [bracketed placeholder]
    like [X%], [N hours/week], [+revenue], [conversion lift], [cycle-time reduction] and set has_placeholders=true.
  - NEVER produce vague filler such as "delivered measurable business outcomes",
    "collaborated cross-functionally", "worked on…", "responsible for…".
  - 28-55 words per rewrite. No buzzword salads.
  - Match the role-style voice provided.
  - issue: one sentence naming the SPECIFIC weakness (vague verb, missing metric, no scope, etc.).
  - reason: one sentence on what the rewrite adds.
  - keywords_added: 3-7 concrete keywords from the JD or target role.
  - score_impact: realistic integer lifts in 0-15 range; +0 if marginal, never negative.
`;

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }): Promise<CvAnalysisRow> => {
    const { supabase, userId } = context;

    let cvVersionId = data.cvVersionId;
    if (!cvVersionId) {
      const { data: primary } = await supabase
        .from("cvs")
        .select("id")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .maybeSingle();
      if (!primary) throw new Error("No primary CV found. Complete onboarding first.");
      const { data: v } = await supabase
        .from("cv_versions")
        .select("id")
        .eq("cv_id", primary.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!v) throw new Error("No CV version found.");
      cvVersionId = v.id;
    }

    const { data: version, error: vErr } = await supabase
      .from("cv_versions")
      .select("id, raw_text, parsed")
      .eq("id", cvVersionId)
      .eq("user_id", userId)
      .single();
    if (vErr || !version) throw new Error("CV not found");

    const cvText = version.raw_text ?? JSON.stringify(version.parsed ?? {});
    const { callGatewayJSON } = await import("./ai-gateway.server");
    const roleStyle = data.roleStyle ?? "ai-pm";

    const ai = await callGatewayJSON<AiPayload>({
      messages: [
        {
          role: "system",
          content:
            "You are a senior FAANG hiring manager + ATS specialist + executive resume coach. Score the CV honestly. Produce STRICT JSON only.\n\n" +
            FAANG_BULLET_RULES +
            `\n\nROLE STYLE: ${ROLE_STYLE_GUIDE[roleStyle]}`,
        },
        {
          role: "user",
          content: `${data.targetRole ? `Target role: ${data.targetRole}\n\n` : ""}${
            data.jdText ? `JOB DESCRIPTION:\n${data.jdText}\n\n` : ""
          }CV TEXT:\n${cvText.slice(0, 12000)}\n\nReturn JSON:
{
  "match_score": 0-100 ${data.jdText ? "(vs JD)" : "(general role fit)"},
  "potential_match_score": 0-100 (projected score if ALL rewrites + suggested bullets accepted; must be >= match_score),
  "ats_keyword_match": 0-100 (current ATS keyword coverage),
  "scores": { "impact":0-100, "brevity":0-100, "style":0-100, "ats_fit":0-100, "skills_match":0-100, "clarity":0-100 },
  "bullet_feedback": [
    {
      "original": "exact text of a weak bullet from the CV",
      "issue": "one-sentence diagnosis (vague verb / missing metric / no scope / no business outcome / etc.)",
      "rewrite": "FAANG X-Y-Z rewrite, 28-55 words, with metric or [bracketed] placeholder",
      "reason": "one sentence on why the rewrite is stronger",
      "keywords_added": ["3-7 concrete keywords"],
      "score_impact": { "jd_match": 0-15, "ats_keyword": 0-15, "recruiter_scan": 0-15 },
      "has_placeholders": true|false,
      "strength": 0-100
    }
  ] (5-8 of the weakest/most-improvable bullets — never generic filler),
  "missing_keywords": string[] (8-15, only if JD provided, else []),
  "matched_keywords": string[] (8-15),
  "suggested_bullets": string[] (3-5 NEW bullets to add, each following X-Y-Z),
  "summary": "2-3 sentence honest verdict",
  "suggested_summary": "A premium professional summary (60-90 words) for the target role: years of experience, domains owned, signature outcomes, core skills, cross-functional reach. No filler, no buzzword lists."
}`,
        },
      ],
    });

    // Defensive normalisation so the UI never crashes on missing fields.
    const normalisedBullets: BulletFeedback[] = (ai.bullet_feedback ?? []).map((b) => ({
      original: b.original ?? "",
      rewrite: b.rewrite ?? "",
      issue: b.issue ?? "Too generic — lacks ownership, scale, or measurable outcome.",
      reason: b.reason ?? "Adds scope, metric, and role-relevant keywords.",
      keywords_added: Array.isArray(b.keywords_added) ? b.keywords_added : [],
      score_impact: {
        jd_match: b.score_impact?.jd_match ?? 0,
        ats_keyword: b.score_impact?.ats_keyword ?? 0,
        recruiter_scan: b.score_impact?.recruiter_scan ?? 0,
      },
      has_placeholders:
        b.has_placeholders ?? /\[[^\]]+\]/.test(b.rewrite ?? ""),
      strength: b.strength ?? 50,
    }));

    const enriched = {
      ...ai,
      bullet_feedback: normalisedBullets,
      role_style: roleStyle,
    };

    const { data: row, error } = await supabase
      .from("cv_analyses")
      .insert({
        user_id: userId,
        cv_version_id: cvVersionId,
        target_jd_text: data.jdText ?? null,
        match_score: ai.match_score ?? null,
        scores: enriched.scores as never,
        bullet_feedback: enriched.bullet_feedback as never,
        missing_keywords: ai.missing_keywords as never,
        matched_keywords: ai.matched_keywords as never,
        suggested_bullets: ai.suggested_bullets as never,
        summary: ai.summary,
        // Stash the extras in scores as well so the UI can always read them.
      })
      .select("*")
      .single();
    if (error) throw error;

    const out = row as unknown as CvAnalysisRow;
    out.potential_match_score = ai.potential_match_score;
    out.ats_keyword_match = ai.ats_keyword_match;
    out.suggested_summary = ai.suggested_summary;
    out.role_style = roleStyle;
    return out;
  });

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CvAnalysisRow[]> => {
    const { data, error } = await context.supabase
      .from("cv_analyses")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []) as unknown as CvAnalysisRow[];
  });

// ---------- Bullet-level rewrite actions ----------

const RewriteInput = z.object({
  original: z.string().min(3),
  currentRewrite: z.string().optional(),
  mode: z.enum(["regenerate", "more-senior", "more-concise"]),
  roleStyle: z.enum(ROLE_STYLES).optional(),
  targetRole: z.string().optional(),
  jdText: z.string().optional(),
});

type RewriteOut = {
  rewrite: string;
  issue: string;
  reason: string;
  keywords_added: string[];
  score_impact: ScoreImpact;
  has_placeholders: boolean;
};

export const rewriteBullet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RewriteInput.parse(input))
  .handler(async ({ data }): Promise<RewriteOut> => {
    const { callGatewayJSON } = await import("./ai-gateway.server");
    const roleStyle = data.roleStyle ?? "ai-pm";

    const modeBrief: Record<typeof data.mode, string> = {
      regenerate:
        "Generate a fresh, different angle on the rewrite. Same FAANG X-Y-Z rules. Do not repeat the previous wording.",
      "more-senior":
        "Re-frame the rewrite at a more senior level: ownership of strategy / multiple teams / org-level outcomes / multi-quarter scope. Keep it truthful — add bracketed placeholders if details are unknown.",
      "more-concise":
        "Tighten the rewrite to a single sharp sentence under 30 words while keeping the metric, mechanism, and outcome.",
    } as const;

    const out = await callGatewayJSON<RewriteOut>({
      messages: [
        {
          role: "system",
          content:
            "You are a senior FAANG hiring manager + executive resume coach. Output STRICT JSON.\n\n" +
            FAANG_BULLET_RULES +
            `\n\nROLE STYLE: ${ROLE_STYLE_GUIDE[roleStyle]}`,
        },
        {
          role: "user",
          content: `${data.targetRole ? `Target role: ${data.targetRole}\n` : ""}${
            data.jdText ? `JD context:\n${data.jdText.slice(0, 4000)}\n\n` : ""
          }ORIGINAL BULLET:\n${data.original}\n\n${
            data.currentRewrite ? `CURRENT REWRITE:\n${data.currentRewrite}\n\n` : ""
          }MODE: ${modeBrief[data.mode]}

Return JSON:
{
  "rewrite": "...",
  "issue": "one-sentence diagnosis of the original",
  "reason": "one sentence on why this rewrite is stronger",
  "keywords_added": ["..."],
  "score_impact": { "jd_match": 0-15, "ats_keyword": 0-15, "recruiter_scan": 0-15 },
  "has_placeholders": true|false
}`,
        },
      ],
    });

    return {
      rewrite: out.rewrite ?? "",
      issue: out.issue ?? "",
      reason: out.reason ?? "",
      keywords_added: Array.isArray(out.keywords_added) ? out.keywords_added : [],
      score_impact: {
        jd_match: out.score_impact?.jd_match ?? 0,
        ats_keyword: out.score_impact?.ats_keyword ?? 0,
        recruiter_scan: out.score_impact?.recruiter_scan ?? 0,
      },
      has_placeholders: out.has_placeholders ?? /\[[^\]]+\]/.test(out.rewrite ?? ""),
    };
  });
