from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# services/ai/app/config.py -> repo root is three parents up.
_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_base_url: str = ""
    # Privileged direct Postgres connection to Supabase (trusted backend, RLS-exempt).
    supabase_db_url: str = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "gpt-4o-mini"
    cors_origins: str = "http://localhost:3000"

    # Load the repo-root .env regardless of the process working directory, then
    # allow a local services/ai/.env to override it. Later files win.
    model_config = SettingsConfigDict(
        env_file=(str(_REPO_ROOT / ".env"), ".env"),
        extra="ignore",
    )


settings = Settings()
