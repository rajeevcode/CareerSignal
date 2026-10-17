import re
from typing import Any

from app.matching.engine import competition_score, freshness_score


def availability_score(candidate: dict[str, Any]) -> float:
    notice = str(candidate.get("notice_period") or "").strip().lower()
    if not notice:
        return 60.0
    if notice in {"immediate", "immediately", "available immediately", "no notice", "0"}:
        return 95.0
    # Full match prevents "30 days", "60 days" and "90 days" matching the digit 0.
    match = re.fullmatch(r"(\d+)\s*(days?|weeks?|months?)?", notice)
    if not match:
        return 65.0
    quantity = int(match.group(1))
    unit = match.group(2) or "days"
    days = quantity * (30 if unit.startswith("month") else 7 if unit.startswith("week") else 1)
    if days == 0:
        return 95.0
    if days <= 15:
        return 85.0
    if days <= 30:
        return 75.0
    return 65.0


def compute_interview_signal(
    jd_match_score: float,
    cv_score: float,
    job: dict[str, Any],
    candidate: dict[str, Any],
) -> float:
    freshness = freshness_score(job.get("posted_at") or "")
    competition = competition_score(job.get("applicant_count"))
    availability = availability_score(candidate)
    recruiter_activity = 50.0

    signal = (
        jd_match_score * 0.50
        + cv_score * 0.20
        + freshness * 0.10
        + competition * 0.10
        + availability * 0.05
        + recruiter_activity * 0.05
    )
    return round(signal, 1)


def merge_match_result(
    jd_breakdown: dict[str, float],
    interview_signal: float,
    job: dict[str, Any],
) -> dict[str, float]:
    freshness = freshness_score(job.get("posted_at") or "")
    competition = competition_score(job.get("applicant_count"))
    return {
        **jd_breakdown,
        "competition_score": round(competition, 1),
        "freshness_score": round(freshness, 1),
        "jd_match_score": jd_breakdown["jd_match_score"],
        "interview_signal": interview_signal,
        "final_score": interview_signal,
    }
