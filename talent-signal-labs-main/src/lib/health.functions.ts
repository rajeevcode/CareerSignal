import { createServerFn } from "@tanstack/react-start";

export type HealthSeverity = "ok" | "degraded" | "down";

export type HealthCheck = {
  name: string;
  ok: boolean;
  severity: HealthSeverity;
  detail: string;
  ms: number;
};

export type AiStatus = {
  severity: HealthSeverity;
  detail: string;
  ms: number;
  rateLimited: boolean;
  timedOut: boolean;
};

export type HealthReport = {
  ok: boolean;
  checkedAt: string;
  checks: HealthCheck[];
  ai: AiStatus;
};

// Thresholds for AI Gateway latency (ms) before we mark it degraded.
const AI_SLOW_MS = 1500;
const AI_TIMEOUT_MS = 5000;

async function timed(
  name: string,
  fn: () => Promise<{ ok: boolean; severity?: HealthSeverity; detail: string }>,
): Promise<HealthCheck> {
  const t0 = Date.now();
  try {
    const { ok, detail, severity } = await fn();
    return {
      name,
      ok,
      severity: severity ?? (ok ? "ok" : "down"),
      detail,
      ms: Date.now() - t0,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      severity: "down",
      detail: e instanceof Error ? e.message : String(e),
      ms: Date.now() - t0,
    };
  }
}

async function checkAiGateway(apiKey: string | undefined): Promise<AiStatus> {
  const t0 = Date.now();
  if (!apiKey) {
    return {
      severity: "down",
      detail: "LOVABLE_API_KEY missing",
      ms: 0,
      rateLimited: false,
      timedOut: false,
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    const ms = Date.now() - t0;
    if (res.status === 429) {
      return {
        severity: "degraded",
        detail: "AI Gateway is rate-limiting requests (429). Please slow down or wait a moment.",
        ms,
        rateLimited: true,
        timedOut: false,
      };
    }
    if (res.status === 402) {
      return {
        severity: "down",
        detail: "AI credits exhausted (402). Add credits to keep AI features working.",
        ms,
        rateLimited: false,
        timedOut: false,
      };
    }
    if (!res.ok) {
      return {
        severity: "down",
        detail: `Gateway responded ${res.status}`,
        ms,
        rateLimited: false,
        timedOut: false,
      };
    }
    if (ms > AI_SLOW_MS) {
      return {
        severity: "degraded",
        detail: `AI Gateway is slow (${ms}ms). Responses may take longer than usual.`,
        ms,
        rateLimited: false,
        timedOut: false,
      };
    }
    return {
      severity: "ok",
      detail: "Reachable",
      ms,
      rateLimited: false,
      timedOut: false,
    };
  } catch (e) {
    const ms = Date.now() - t0;
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      severity: "down",
      detail: aborted
        ? `AI Gateway timed out after ${AI_TIMEOUT_MS}ms`
        : e instanceof Error
          ? e.message
          : String(e),
      ms,
      rateLimited: false,
      timedOut: aborted,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runHealthChecks(): Promise<HealthReport> {
  const { createClient } = await import("@supabase/supabase-js");

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

  const checks: HealthCheck[] = [];

  checks.push(
    await timed("Auth config", async () => {
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        return { ok: false, detail: "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY" };
      }
      return { ok: true, detail: "Auth keys present" };
    }),
  );

  checks.push(
    await timed("Database", async () => {
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        return { ok: false, detail: "Skipped — auth config missing" };
      }
      const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { error, count } = await sb
        .from("companies")
        .select("id", { count: "exact", head: true });
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `Reachable · ${count ?? 0} companies` };
    }),
  );

  const ai = await checkAiGateway(LOVABLE_API_KEY);
  checks.push({
    name: "AI Gateway",
    ok: ai.severity === "ok",
    severity: ai.severity,
    detail: ai.detail,
    ms: ai.ms,
  });

  return {
    // "ok" treats degraded as still up so the /api/health endpoint stays 200
    // for degraded states; the UI consumes `ai.severity` to warn the user.
    ok: checks.every((c) => c.severity !== "down"),
    checkedAt: new Date().toISOString(),
    checks,
    ai,
  };
}

export const getHealth = createServerFn({ method: "GET" }).handler(async () => runHealthChecks());
