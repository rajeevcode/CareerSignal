from openai import OpenAI

from app.config import settings

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def uses_openrouter() -> bool:
    if settings.openai_base_url and "openrouter" in settings.openai_base_url:
        return True
    return settings.openai_api_key.startswith("sk-or-")


def resolve_base_url() -> str | None:
    if settings.openai_base_url:
        return settings.openai_base_url
    if settings.openai_api_key.startswith("sk-or-"):
        return OPENROUTER_BASE_URL
    return None


def resolve_model(model: str) -> str:
    if uses_openrouter() and "/" not in model:
        return f"openai/{model}"
    return model


def get_openai() -> OpenAI:
    kwargs: dict[str, str] = {"api_key": settings.openai_api_key}
    base_url = resolve_base_url()
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)
