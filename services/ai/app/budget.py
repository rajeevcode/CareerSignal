"""Global LLM-spend circuit-breaker.

Bounds the total provider bill across ALL users. Before each LLM call,
`check_budget()` verifies the rolling spend in the current UTC day and month is
under the configured ceilings; if a ceiling is hit it raises `BudgetExceeded`,
which the API layer maps to HTTP 503. After each call, `record()` appends the
call's cost to the ledger.

A short in-process cache avoids a SUM query on every single call: spend only
grows within a window, so once we've observed we're over a cap we can keep
refusing without re-querying, and under a cap we re-check at most every
CACHE_TTL_SECONDS. This is intentionally approximate — the breaker's job is to
bound the bill, not to bill to the cent, and a few seconds of staleness is fine.
"""

import logging
import threading
from datetime import datetime, timezone

from app import db
from app.config import settings
from app.pricing import cost_usd

logger = logging.getLogger("careersignal.budget")

CACHE_TTL_SECONDS = 10.0


class BudgetExceeded(Exception):
    """Raised when a global spend ceiling is reached. Maps to HTTP 503."""

    def __init__(self, window: str, spent: float, cap: float):
        self.window = window
        self.spent = spent
        self.cap = cap
        super().__init__(
            f"LLM {window} budget exhausted: ${spent:.2f} spent of ${cap:.2f} cap"
        )


# Cache of (window_start_iso -> (spent_usd, observed_at_monotonic)) guarded by a
# lock because FastAPI may serve requests across threads.
_lock = threading.Lock()
_cache: dict[str, tuple[float, float]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _day_start_iso(now: datetime) -> str:
    return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def _month_start_iso(now: datetime) -> str:
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()


def _monotonic() -> float:
    # Wall clock is fine for a coarse TTL; monotonic avoids clock-skew surprises.
    import time

    return time.monotonic()


def _spent_in_window(window_start_iso: str) -> float:
    """Spend since window start, cached for CACHE_TTL_SECONDS per window key."""
    now_mono = _monotonic()
    with _lock:
        cached = _cache.get(window_start_iso)
        if cached and (now_mono - cached[1]) < CACHE_TTL_SECONDS:
            return cached[0]
    # Query outside the lock so a slow DB call doesn't serialize all callers.
    spent = db.llm_spend_since(window_start_iso)
    with _lock:
        _cache[window_start_iso] = (spent, now_mono)
        # Keep the cache from growing unbounded across day/month rollovers.
        if len(_cache) > 8:
            _prune_locked(now_mono)
    return spent


def _prune_locked(now_mono: float) -> None:
    stale = [k for k, (_, ts) in _cache.items() if (now_mono - ts) >= CACHE_TTL_SECONDS]
    for k in stale:
        _cache.pop(k, None)


def _bump_cache(window_start_iso: str, delta: float) -> None:
    """Reflect a just-recorded cost in the cache so the next check sees it."""
    with _lock:
        cached = _cache.get(window_start_iso)
        if cached:
            _cache[window_start_iso] = (cached[0] + delta, cached[1])


def check_budget() -> None:
    """Raise BudgetExceeded if any window is at/over its cap. No-op if uncapped."""
    now = _now()
    windows = (
        ("daily", settings.llm_daily_budget_usd, _day_start_iso(now)),
        ("monthly", settings.llm_monthly_budget_usd, _month_start_iso(now)),
    )
    for name, cap, start_iso in windows:
        if cap is None or cap <= 0:
            continue  # unlimited
        spent = _spent_in_window(start_iso)
        if spent >= cap:
            logger.warning("LLM %s budget hit: $%.2f >= $%.2f", name, spent, cap)
            raise BudgetExceeded(name, spent, cap)


def record(
    *,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    feature: str | None = None,
    candidate_id: str | None = None,
) -> float:
    """Compute and persist the cost of one LLM call. Returns the USD cost.

    Best-effort: a bookkeeping failure must never break the user's request, so
    DB errors are logged and swallowed. The in-memory cache is still bumped on
    the happy path so the breaker reacts immediately without waiting for the
    next SUM query.
    """
    cost = cost_usd(model, prompt_tokens, completion_tokens)
    try:
        db.record_llm_spend(
            model=model,
            feature=feature,
            candidate_id=candidate_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=cost,
        )
        now = _now()
        _bump_cache(_day_start_iso(now), cost)
        _bump_cache(_month_start_iso(now), cost)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to record LLM spend (model=%s, cost=$%.4f)", model, cost)
    return cost
