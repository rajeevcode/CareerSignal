from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_base_url: str = ""
    database_path: str = "../../data/careersignal.db"
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "gpt-4o-mini"
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
