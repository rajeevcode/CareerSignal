-- ---------------------------------------------------------------------------
-- LLM spend ledger (2026-06-24)
--
-- Append-only record of every LLM API call's token usage and computed USD cost,
-- written by the trusted Python AI service (postgres superuser, RLS-exempt). It
-- backs the GLOBAL spend circuit-breaker (app/budget.py): the service sums
-- recent cost_usd across ALL users and refuses new LLM calls once a daily or
-- monthly ceiling is hit, bounding the provider bill against runaway loops/abuse.
--
-- This is operational data, never surfaced to end users. RLS is enabled with NO
-- policy, so `authenticated`/`anon` (PostgREST) get zero rows; only the
-- service-role / superuser backend can read or write it. Idempotent.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS llm_spend (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model             TEXT NOT NULL,
  feature           TEXT,
  -- Nullable + ON DELETE SET NULL: spend history is operational and must outlive
  -- the candidate row (we still want the cost recorded after a user is deleted).
  candidate_id      UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd          NUMERIC(12, 6) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The circuit-breaker's only read is SUM(cost_usd) WHERE created_at >= window
-- start, run on every LLM call — keep it index-backed so it stays O(window),
-- not O(table), as the ledger grows.
CREATE INDEX IF NOT EXISTS idx_llm_spend_created_at ON llm_spend (created_at);

ALTER TABLE llm_spend ENABLE ROW LEVEL SECURITY;
-- No policy by design: deny-all to authenticated/anon. Backend access only.
