import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DashboardJob = {
  id: string;
  title: string;
  company: string;
  company_id: string | null;
  location: string | null;
  remote_policy: string | null;
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  visa_sponsorship: boolean | null;
  skills: string[];
  match: number;
  matched_skills: string[];
  missing_skills: string[];
};

export type DashboardPayload = {
  profile: { full_name: string | null; headline: string | null; target_role: string | null };
  prefs: {
    onboarding_completed: boolean;
    markets: string[];
    work_modes: string[];
    needs_visa: boolean;
  } | null;
  latestScore: {
    overall: number;
    sub_scores: Record<string, number>;
    strengths: string[];
    improvements: string[];
    summary: string | null;
  } | null;
  metrics: {
    careerHealth: number;
    cvScore: number;
    bestRoleFit: number;
    highMatchJobs: number;
    applicationsThisMonth: number;
    followUpsDue: number;
  };
  jobs: DashboardJob[];
  applications: Array<{
    id: string;
    status: string;
    match_score: number | null;
    job_title: string | null;
    company: string | null;
    applied_at: string | null;
  }>;
  roleProbabilities: Array<{ title: string; score: number }>;
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardPayload> => {
    const { supabase, userId } = context;

    const [profileRes, prefsRes, scoreRes, rolesRes, jobsRes, appsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, headline, target_role").eq("id", userId).maybeSingle(),
      supabase
        .from("candidate_preferences")
        .select("onboarding_completed, markets, work_modes, needs_visa")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("cv_scores")
        .select("overall, sub_scores, strengths, improvements, summary, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("target_roles")
        .select("title, fit_score")
        .eq("user_id", userId)
        .order("is_primary", { ascending: false }),
      supabase
        .from("jobs")
        .select("id, title, location, remote_policy, seniority, salary_min, salary_max, salary_currency, visa_sponsorship, skills, company_id, companies(name)")
        .eq("active", true)
        .limit(30),
      supabase
        .from("applications")
        .select("id, status, match_score, applied_at, jobs(title, companies(name))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Build candidate skill set from latest CV version
    let candidateSkills: string[] = [];
    const { data: latestVersion } = await supabase
      .from("cv_versions")
      .select("parsed, raw_text")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestVersion) {
      const parsed = latestVersion.parsed as { skills?: string[] } | null;
      if (parsed?.skills && Array.isArray(parsed.skills)) {
        candidateSkills = parsed.skills.map((s) => s.toLowerCase());
      } else if (latestVersion.raw_text) {
        candidateSkills = Array.from(tokenize(latestVersion.raw_text));
      }
    }
    const candSet = new Set(candidateSkills.map((s) => s.toLowerCase()));

    const targetRole = profileRes.data?.target_role?.toLowerCase() ?? "";
    const prefs = prefsRes.data;

    const allJobs = jobsRes.data ?? [];
    const ranked: DashboardJob[] = allJobs
      .map((j) => {
        const skills = (j.skills ?? []) as string[];
        const matched = skills.filter((s) => candSet.has(s.toLowerCase()));
        const missing = skills.filter((s) => !candSet.has(s.toLowerCase()));
        let match = skills.length > 0 ? Math.round((matched.length / skills.length) * 90) : 50;
        if (targetRole && j.title.toLowerCase().includes(targetRole.split(" ")[0] ?? "")) match += 5;
        if (prefs?.needs_visa && j.visa_sponsorship) match += 5;
        match = Math.min(99, Math.max(20, match));
        const company =
          (j.companies as { name?: string } | null)?.name ?? "Confidential";
        return {
          id: j.id,
          title: j.title,
          company,
          company_id: j.company_id,
          location: j.location,
          remote_policy: j.remote_policy,
          seniority: j.seniority,
          salary_min: j.salary_min,
          salary_max: j.salary_max,
          salary_currency: j.salary_currency,
          visa_sponsorship: j.visa_sponsorship,
          skills,
          match,
          matched_skills: matched,
          missing_skills: missing,
        };
      })
      .sort((a, b) => b.match - a.match);

    const highMatchJobs = ranked.filter((j) => j.match >= 75).length;

    const nowMonth = new Date();
    nowMonth.setDate(1);
    const applicationsThisMonth = (appsRes.data ?? []).filter(
      (a) => a.applied_at && new Date(a.applied_at) >= nowMonth,
    ).length;

    const cvScore = scoreRes.data?.overall ?? 0;
    const bestRoleFit = Math.max(0, ...(rolesRes.data ?? []).map((r) => r.fit_score ?? 0));
    const careerHealth = Math.round((cvScore * 0.4 + bestRoleFit * 0.3 + (ranked[0]?.match ?? 0) * 0.3));

    return {
      profile: profileRes.data ?? { full_name: null, headline: null, target_role: null },
      prefs: prefs
        ? {
            onboarding_completed: prefs.onboarding_completed,
            markets: prefs.markets ?? [],
            work_modes: prefs.work_modes ?? [],
            needs_visa: prefs.needs_visa ?? false,
          }
        : null,
      latestScore: scoreRes.data
        ? {
            overall: scoreRes.data.overall,
            sub_scores: (scoreRes.data.sub_scores as Record<string, number>) ?? {},
            strengths: (scoreRes.data.strengths as string[]) ?? [],
            improvements: (scoreRes.data.improvements as string[]) ?? [],
            summary: scoreRes.data.summary,
          }
        : null,
      metrics: {
        careerHealth,
        cvScore,
        bestRoleFit,
        highMatchJobs,
        applicationsThisMonth,
        followUpsDue: 0,
      },
      jobs: ranked.slice(0, 8),
      applications: (appsRes.data ?? []).map((a) => ({
        id: a.id,
        status: a.status,
        match_score: a.match_score,
        job_title: (a.jobs as { title?: string } | null)?.title ?? null,
        company:
          ((a.jobs as { companies?: { name?: string } | null } | null)?.companies?.name) ?? null,
        applied_at: a.applied_at,
      })),
      roleProbabilities: (rolesRes.data ?? []).map((r) => ({
        title: r.title,
        score: r.fit_score ?? 0,
      })),
    };
  });
