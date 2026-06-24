from typing import Any

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


def chat_completion(
    *,
    messages: list[dict[str, Any]],
    model: str | None = None,
    feature: str | None = None,
    candidate_id: str | None = None,
    **kwargs: Any,
):
    """Single chokepoint for chat completions: enforce + meter the spend budget.

    Wraps ``client.chat.completions.create`` so every LLM call (1) is refused
    with ``BudgetExceeded`` when the global daily/monthly USD ceiling is hit, and
    (2) records its actual token usage and cost to the ledger afterward. Callers
    pass the same kwargs they'd pass to ``.create`` (temperature, response_format,
    max_tokens, ...) plus ``feature``/``candidate_id`` for spend attribution.

    Importing budget lazily keeps openai_client free of a DB dependency at import
    time (and avoids a cycle), matching how endpoints import db on demand.
    """
    from app import budget

    resolved = resolve_model(model or settings.llm_model)
    # Enforce BEFORE spending: if we're already over budget, don't call the API.
    budget.check_budget()

    response = get_openai().chat.completions.create(
        model=resolved, messages=messages, **kwargs
    )

    usage = getattr(response, "usage", None)
    budget.record(
        model=resolved,
        prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
        completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
        feature=feature,
        candidate_id=candidate_id,
    )
    return response


def embedding(
    *,
    input: Any,
    model: str | None = None,
    feature: str | None = None,
    candidate_id: str | None = None,
    **kwargs: Any,
):
    """Budget-enforced + metered wrapper around ``client.embeddings.create``.

    Embeddings have only prompt tokens (no completion), so cost is metered off
    ``usage.prompt_tokens`` against the embedding model's input price.
    """
    from app import budget

    resolved = resolve_model(model or settings.embedding_model)
    budget.check_budget()

    response = get_openai().embeddings.create(model=resolved, input=input, **kwargs)

    usage = getattr(response, "usage", None)
    budget.record(
        model=resolved,
        prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
        completion_tokens=0,
        feature=feature,
        candidate_id=candidate_id,
    )
    return response
