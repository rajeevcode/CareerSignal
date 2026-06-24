"""LLM cost model: map (model, token usage) -> USD.

Prices are USD per 1,000,000 tokens, split into prompt ("input") and completion
("output") rates — the standard OpenAI / OpenRouter billing shape. The table is a
best-effort snapshot; it does not have to be exact to the cent for the spend
circuit-breaker to do its job (bound the bill), and operators can correct any
entry at runtime via LLM_PRICE_OVERRIDES without a code change.
"""

import json
import logging

from app.config import settings

logger = logging.getLogger("careersignal.pricing")

# USD per 1M tokens. Keys are matched case-insensitively against the resolved
# model id, with and without an "openai/" OpenRouter prefix (see price_for).
_DEFAULT_PRICES: dict[str, dict[str, float]] = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4.1-mini": {"input": 0.40, "output": 1.60},
    "gpt-4.1": {"input": 2.00, "output": 8.00},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    "text-embedding-3-small": {"input": 0.02, "output": 0.00},
    "text-embedding-3-large": {"input": 0.13, "output": 0.00},
}

# Fallback when a model is entirely unknown: assume a mid-tier price so an
# unrecognized model still counts toward the budget instead of registering as
# free (which would defeat the circuit-breaker). Deliberately not cheap.
_UNKNOWN_PRICE = {"input": 5.00, "output": 15.00}


def _load_overrides() -> dict[str, dict[str, float]]:
    raw = settings.llm_price_overrides.strip()
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            raise ValueError("LLM_PRICE_OVERRIDES must be a JSON object")
        return {str(k).lower(): v for k, v in parsed.items()}
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Ignoring invalid LLM_PRICE_OVERRIDES: %s", exc)
        return {}


# Built-in defaults merged with operator overrides, lower-cased for lookup.
_PRICES: dict[str, dict[str, float]] = {
    **{k.lower(): v for k, v in _DEFAULT_PRICES.items()},
    **_load_overrides(),
}


def _normalize(model: str) -> str:
    """Strip a provider routing prefix so 'openai/gpt-4o-mini' matches 'gpt-4o-mini'."""
    m = model.lower()
    if "/" in m:
        m = m.split("/", 1)[1]
    return m


def price_for(model: str) -> dict[str, float]:
    """Return {'input', 'output'} USD-per-1M-tokens for a model id.

    Tries the exact id first (so an override can target 'openai/gpt-4o-mini'
    specifically), then the provider-stripped id, then the unknown fallback.
    """
    key = model.lower()
    if key in _PRICES:
        return _PRICES[key]
    stripped = _normalize(model)
    if stripped in _PRICES:
        return _PRICES[stripped]
    logger.warning("No price for model %r; using unknown-model fallback", model)
    return _UNKNOWN_PRICE


def cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Cost in USD for one call. Tolerant of None/negative token counts."""
    p = price_for(model)
    prompt = max(int(prompt_tokens or 0), 0)
    completion = max(int(completion_tokens or 0), 0)
    return (prompt * p["input"] + completion * p["output"]) / 1_000_000
