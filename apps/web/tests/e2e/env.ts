import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the monorepo-root .env (there is no apps/web/.env).
function loadRootEnv() {
  const envPath = resolve(__dirname, '../../../../.env');
  try {
    const raw = readFileSync(envPath, 'utf-8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // env may already be in process.env (e.g. CI) — validation below catches gaps.
  }
}
loadRootEnv();

function need(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`[e2e] Missing required env var ${key}. Ensure the monorepo-root .env is populated.`);
  return v;
}

export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
export const SUPA_URL = need('NEXT_PUBLIC_SUPABASE_URL');
export const ANON_KEY = need('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const SERVICE_KEY = need('SUPABASE_SERVICE_ROLE_KEY');
export const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8011';
export const TEST_PREFIX = 'csqa+';
export const TEST_PASSWORD = 'Passw0rd!';

let aiUp: boolean | null = null;

/** Pre-flight the stack; throws if web/Supabase are down. AI is optional (gates @needs-ai). */
export async function preflight(): Promise<{ aiUp: boolean }> {
  const ping = async (url: string, timeoutMs = 4000) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      return r.ok || r.status < 500;
    } catch {
      return false;
    }
  };

  const [web, supa] = await Promise.all([
    ping(`${BASE_URL}/login`),
    ping(`${SUPA_URL}/auth/v1/health`),
  ]);
  if (!web) throw new Error(`[e2e] Web app not reachable at ${BASE_URL}. Start it with: pnpm dev`);
  if (!supa) throw new Error(`[e2e] Supabase not reachable at ${SUPA_URL}. Start it with: supabase start`);

  // Cache AI status the first time it's positively confirmed (its /health is
  // cheap, but the service can be momentarily busy with LLM calls under parallel
  // load — give it a generous timeout + one retry so AI specs don't flap-skip).
  if (aiUp !== true) {
    aiUp = (await ping(`${AI_URL}/health`, 10_000)) || (await ping(`${AI_URL}/health`, 10_000));
  }
  return { aiUp: aiUp };
}

export function isAiUp(): boolean {
  return aiUp === true;
}
