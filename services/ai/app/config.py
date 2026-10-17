from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# services/ai/app/config.py -> repo root is three parents up on the host.
# In Docker the service is the build-context root (fewer parents), so guard the
# index and fall back to the service dir; OS env (compose) is the source of truth there.
_PARENTS = Path(__file__).resolve().parents
_REPO_ROOT = _PARENTS[3] if len(_PARENTS) > 3 else _PARENTS[len(_PARENTS) - 1]


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_base_url: str = ""
    # Privileged direct Postgres connection to Supabase (trusted backend, RLS-exempt).
    supabase_db_url: str = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "gpt-4o-mini"
    cors_origins: str = "http://localhost:3000"
    # Shared secret the trusted Next.js backend sends as `X-Internal-Token`.
    # When set, every endpoint requires it (the service does no per-user authz of
    # its own — it trusts the backend). Leave empty ONLY for local dev where the
    # port is not reachable from outside the host.
    internal_api_token: str = ""

    # --- LLM spend circuit-breaker -----------------------------------------
    # Global (all-users) USD ceilings on LLM API spend. When the rolling spend
    # in a window reaches its cap, new LLM calls are refused with BudgetExceeded
    # (HTTP 503) so a runaway loop / abuse spike can't silently rack up an
    # unbounded provider bill. 0 or negative = that window is unlimited.
    # Daily resets at 00:00 UTC; monthly at the 1st 00:00 UTC.
    llm_daily_budget_usd: float = 50.0
    llm_monthly_budget_usd: float = 1000.0
    # Per-model override prices in USD per 1M tokens, as JSON:
    #   {"gpt-4o": {"input": 2.5, "output": 10}, "openai/gpt-4o-mini": {...}}
    # Merged over the built-in defaults in pricing.py; lets you adjust prices or
    # add a model without a code change. Empty = use built-in defaults only.
    llm_price_overrides: str = ""

    # Load the repo-root .env regardless of the process working directory, then
    # allow a local services/ai/.env to override it. Later files win.
    model_config = SettingsConfigDict(
        env_file=(str(_REPO_ROOT / ".env"), ".env"),
        extra="ignore",
    )


settings = Settings()
