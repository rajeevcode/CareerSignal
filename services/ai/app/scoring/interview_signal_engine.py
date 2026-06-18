from typing import Any

from app.matching.engine import competition_score, freshness_score


def availability_score(candidate: dict[str, Any]) -> float:
    notice = (candidate.get("notice_period") or "").lower()
    if "immediate" in notice or "0" in notice:
        return 95.0
    if "15" in notice or "2 week" in notice:
        return 85.0
    if "30" in notice or "1 month" in notice:
        return 75.0
    if notice:
        return 65.0
    return 60.0


def compute_interview_signal(
    jd_match_score: float,
    cv_score: float,
    job: dict[str, Any],
    candidate: dict[str, Any],
) -> float:
    freshness = freshness_score(job.get("posted_at") or "")
    competition = competition_score(job.get("applicant_count") or 0)
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
    competition = competition_score(job.get("applicant_count") or 0)
    return {
        **jd_breakdown,
        "competition_score": round(competition, 1),
        "freshness_score": round(freshness, 1),
        "jd_match_score": jd_breakdown["jd_match_score"],
        "interview_signal": interview_signal,
        "final_score": interview_signal,
    }
