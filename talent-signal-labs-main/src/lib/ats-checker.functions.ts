import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AtsCheckItem = {
  id: string;
  category: "formatting" | "keywords" | "structure" | "contact" | "content";
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  fix: string;
};

export type AtsReport = {
  score: number;
  cvVersionId: string;
  summary: string;
  stats: {
    wordCount: number;
    bulletCount: number;
    sectionsFound: string[];
    sectionsMissing: string[];
    actionVerbsRatio: number;
    quantifiedBullets: number;
  };
  checks: AtsCheckItem[];
  keywordSuggestions: string[];
  topFixes: string[];
};

const Input = z.object({
  cvVersionId: z.string().uuid().optional(),
  jdText: z.string().optional(),
  targetRole: z.string().optional(),
});

const SECTION_PATTERNS: Record<string, RegExp> = {
  Experience: /\b(work\s+experience|professional\s+experience|experience|employment)\b/i,
  Education: /\b(education|academic)\b/i,
  Skills: /\b(skills|technical\s+skills|competencies)\b/i,
  Summary: /\b(summary|profile|objective|about)\b/i,
  Projects: /\bprojects?\b/i,
  Certifications: /\b(certifications?|licenses?)\b/i,
};

const ACTION_VERBS = new Set([
  "led","built","launched","designed","developed","implemented","increased","reduced","drove","owned",
  "shipped","created","managed","architected","optimized","delivered","grew","scaled","automated","migrated",
  "spearheaded","negotiated","streamlined","orchestrated","mentored","established","executed","analyzed","accelerated","generated",
]);

function deterministicChecks(cvText: string) {
  const text = cvText.trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // bullets
  const bulletLines = text.split(/\n+/).filter((l) => /^\s*([•\-\*\u2022]|\d+[\.\)])\s+/.test(l));
  const bulletCount = bulletLines.length;

  // sections
  const sectionsFound: string[] = [];
  const sectionsMissing: string[] = [];
  for (const [name, rx] of Object.entries(SECTION_PATTERNS)) {
    if (rx.test(text)) sectionsFound.push(name);
    else sectionsMissing.push(name);
  }

  // action verbs ratio in bullets
  let verbHits = 0;
  let quantified = 0;
  for (const b of bulletLines) {
    const stripped = b.replace(/^\s*([•\-\*\u2022]|\d+[\.\)])\s+/, "");
    const firstWord = stripped.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
    if (firstWord && ACTION_VERBS.has(firstWord)) verbHits++;
    if (/\d+(%|x|\+| (users|customers|people|hours|days|weeks|months|years|million|thousand|k\b|m\b|b\b))/i.test(stripped) ||
        /\$\s?\d/.test(stripped) || /\d+%/.test(stripped)) quantified++;
  }
  const actionVerbsRatio = bulletCount ? verbHits / bulletCount : 0;

  // contact
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{7,})/.test(text);
  const hasLinkedIn = /linkedin\.com\/in\//i.test(text);

  // formatting smells
  const hasTablesHint = /\|.+\|/.test(text) || /\t.*\t/.test(text);
  const hasNonAscii = /[^\x00-\x7F]/.test(text);
  const longLines = text.split(/\n/).filter((l) => l.length > 200).length;

  const checks: AtsCheckItem[] = [];
  const push = (c: AtsCheckItem) => checks.push(c);

  // Structure
  for (const s of ["Experience", "Education", "Skills"]) {
    push({
      id: `section-${s.toLowerCase()}`,
      category: "structure",
      label: `Section: ${s}`,
      status: sectionsFound.includes(s) ? "pass" : "fail",
      detail: sectionsFound.includes(s) ? `${s} section detected.` : `No "${s}" heading found.`,
      fix: sectionsFound.includes(s) ? "" : `Add an "${s}" heading on its own line so the parser can segment your CV.`,
    });
  }
  for (const s of ["Summary", "Projects", "Certifications"]) {
    if (!sectionsFound.includes(s)) {
      push({
        id: `section-${s.toLowerCase()}`,
        category: "structure",
        label: `Optional section: ${s}`,
        status: "warn",
        detail: `No ${s} section found.`,
        fix: `Consider adding a ${s} section to surface additional signal to recruiters and ATS.`,
      });
    }
  }

  // Contact
  push({
    id: "contact-email",
    category: "contact",
    label: "Email address",
    status: hasEmail ? "pass" : "fail",
    detail: hasEmail ? "Email detected." : "No email address detected.",
    fix: hasEmail ? "" : "Add a professional email near the top of your CV.",
  });
  push({
    id: "contact-phone",
    category: "contact",
    label: "Phone number",
    status: hasPhone ? "pass" : "warn",
    detail: hasPhone ? "Phone detected." : "No phone number detected.",
    fix: hasPhone ? "" : "Add a contact phone number with country code.",
  });
  push({
    id: "contact-linkedin",
    category: "contact",
    label: "LinkedIn URL",
    status: hasLinkedIn ? "pass" : "warn",
    detail: hasLinkedIn ? "LinkedIn profile detected." : "No LinkedIn URL detected.",
    fix: hasLinkedIn ? "" : "Add your linkedin.com/in/<handle> URL in the header.",
  });

  // Formatting
  push({
    id: "format-tables",
    category: "formatting",
    label: "Tables / multi-column layout",
    status: hasTablesHint ? "fail" : "pass",
    detail: hasTablesHint ? "Detected table-like rows or tab columns." : "No table/column artifacts detected.",
    fix: hasTablesHint
      ? "Most ATS parsers mangle tables and multi-column layouts. Convert to a single column with plain text."
      : "",
  });
  push({
    id: "format-nonascii",
    category: "formatting",
    label: "Special characters",
    status: hasNonAscii ? "warn" : "pass",
    detail: hasNonAscii ? "Non-ASCII characters detected (icons/symbols may not parse)." : "Clean ASCII text.",
    fix: hasNonAscii ? "Replace decorative icons/symbols with plain text labels (e.g. Email:, Phone:)." : "",
  });
  push({
    id: "format-length",
    category: "formatting",
    label: "Length",
    status: wordCount < 250 ? "fail" : wordCount > 1200 ? "warn" : "pass",
    detail: `${wordCount} words detected.`,
    fix:
      wordCount < 250
        ? "Your CV looks too short. Aim for 400-800 words covering experience, skills, and impact."
        : wordCount > 1200
        ? "CV is long. Trim to 1-2 pages (≈ 600-1000 words) and keep only your strongest bullets."
        : "",
  });
  push({
    id: "format-longlines",
    category: "formatting",
    label: "Line length",
    status: longLines > 3 ? "warn" : "pass",
    detail: longLines > 3 ? `${longLines} very long lines detected.` : "Line lengths look healthy.",
    fix: longLines > 3 ? "Break long paragraphs into short, scannable bullet points." : "",
  });

  // Content
  push({
    id: "content-bullets",
    category: "content",
    label: "Bulleted achievements",
    status: bulletCount < 5 ? "fail" : bulletCount < 10 ? "warn" : "pass",
    detail: `${bulletCount} bullet lines detected.`,
    fix:
      bulletCount < 5
        ? "Convert prose into 4-6 bullets per role, each starting with a strong action verb."
        : "",
  });
  push({
    id: "content-verbs",
    category: "content",
    label: "Action verbs",
    status: actionVerbsRatio >= 0.6 ? "pass" : actionVerbsRatio >= 0.3 ? "warn" : "fail",
    detail: `${Math.round(actionVerbsRatio * 100)}% of bullets start with a strong action verb.`,
    fix:
      actionVerbsRatio < 0.6
        ? "Start every bullet with a verb like Led, Built, Launched, Reduced, Increased, Drove, Shipped."
        : "",
  });
  push({
    id: "content-quantified",
    category: "content",
    label: "Quantified impact",
    status: quantified >= Math.max(3, bulletCount * 0.4) ? "pass" : quantified > 0 ? "warn" : "fail",
    detail: `${quantified} bullets include numbers, %, or $ impact.`,
    fix:
      quantified < Math.max(3, bulletCount * 0.4)
        ? "Add metrics to every bullet you can: %, $, users, scope, time saved, revenue moved."
        : "",
  });
  push({
    id: "content-firstperson",
    category: "content",
    label: "First-person pronouns",
    status: /\b(i|me|my)\b/i.test(lower) ? "warn" : "pass",
    detail: /\b(i|me|my)\b/i.test(lower)
      ? "Found first-person pronouns (I/me/my)."
      : "No first-person pronouns.",
    fix: /\b(i|me|my)\b/i.test(lower)
      ? "Drop I/me/my — start bullets with the verb instead (e.g. 'Led team of 5' not 'I led a team of 5')."
      : "",
  });

  return {
    checks,
    stats: { wordCount, bulletCount, sectionsFound, sectionsMissing, actionVerbsRatio, quantifiedBullets: quantified },
  };
}

type AiPart = {
  ats_score: number;
  summary: string;
  keyword_suggestions: string[];
  extra_checks: Array<{
    label: string;
    category: "formatting" | "keywords" | "structure" | "contact" | "content";
    status: "pass" | "warn" | "fail";
    detail: string;
    fix: string;
  }>;
  top_fixes: string[];
};

export const runAtsCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<AtsReport> => {
    const { supabase, userId } = context;

    let cvVersionId = data.cvVersionId;
    if (!cvVersionId) {
      const { data: primary } = await supabase
        .from("cvs").select("id").eq("user_id", userId).eq("is_primary", true).maybeSingle();
      if (!primary) throw new Error("No primary CV found. Upload a CV first.");
      const { data: v } = await supabase
        .from("cv_versions").select("id").eq("cv_id", primary.id)
        .order("version_number", { ascending: false }).limit(1).maybeSingle();
      if (!v) throw new Error("No CV version found.");
      cvVersionId = v.id;
    }

    const { data: version, error: vErr } = await supabase
      .from("cv_versions").select("id, raw_text, parsed")
      .eq("id", cvVersionId).eq("user_id", userId).single();
    if (vErr || !version) throw new Error("CV not found");

    const cvText = (version.raw_text ?? JSON.stringify(version.parsed ?? {})).toString();
    const det = deterministicChecks(cvText);

    const { callGatewayJSON } = await import("./ai-gateway.server");
    const ai = await callGatewayJSON<AiPart>({
      messages: [
        {
          role: "system",
          content:
            "You are an ATS (Applicant Tracking System) compliance specialist. Audit the CV for parser-friendliness, keyword coverage, and structure. Output STRICT JSON only.",
        },
        {
          role: "user",
          content: `${data.targetRole ? `Target role: ${data.targetRole}\n` : ""}${
            data.jdText ? `JOB DESCRIPTION:\n${data.jdText.slice(0, 4000)}\n\n` : ""
          }CV TEXT:\n${cvText.slice(0, 10000)}\n\nReturn JSON:\n{\n  "ats_score": 0-100 overall ATS compliance,\n  "summary": "2-3 sentence verdict",\n  "keyword_suggestions": string[] (8-15 industry/role keywords likely missing or under-weighted; if JD provided, derive from JD),\n  "extra_checks": [ { "label": "...", "category": "formatting"|"keywords"|"structure"|"contact"|"content", "status": "pass"|"warn"|"fail", "detail": "...", "fix": "..." } ] (4-8 nuanced checks NOT trivially detectable: job-title clarity, date consistency, tense consistency, keyword density, jargon, etc.),\n  "top_fixes": string[] (3-5 highest-leverage fixes in priority order)\n}`,
        },
      ],
    });

    const aiChecks: AtsCheckItem[] = (ai.extra_checks ?? []).map((c, i) => ({
      id: `ai-${i}`,
      category: c.category,
      label: c.label,
      status: c.status,
      detail: c.detail,
      fix: c.fix,
    }));

    // Combined score: weighted blend of deterministic pass-rate + AI score
    const passWeight = (s: AtsCheckItem["status"]) => (s === "pass" ? 1 : s === "warn" ? 0.5 : 0);
    const detScore =
      (det.checks.reduce((a, c) => a + passWeight(c.status), 0) / Math.max(1, det.checks.length)) * 100;
    const score = Math.round(detScore * 0.5 + (ai.ats_score ?? detScore) * 0.5);

    return {
      score,
      cvVersionId,
      summary: ai.summary ?? "",
      stats: det.stats,
      checks: [...det.checks, ...aiChecks],
      keywordSuggestions: ai.keyword_suggestions ?? [],
      topFixes: ai.top_fixes ?? [],
    };
  });
