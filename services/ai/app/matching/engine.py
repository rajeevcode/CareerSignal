from datetime import datetime, timezone
from typing import Any

import numpy as np
from openai import AuthenticationError, OpenAIError

from app.config import settings
from app.matching.skill_graph import expand_skills, normalize_skills, skill_match_score
from app.budget import BudgetExceeded
from app.openai_client import chat_completion, embedding


async def generate_embedding(text: str) -> list[float]:
    if not text.strip() or not settings.openai_api_key:
        return [0.0] * 1536
    try:
        response = embedding(input=text[:8000], feature="embedding")
        return response.data[0].embedding
    except BudgetExceeded:
        raise
    except (AuthenticationError, OpenAIError):
        return [0.0] * 1536


def cosine_similarity(a: list[float] | None, b: list[float] | None) -> float:
    if not a or not b:
        return 50.0
    va = np.array(a)
    vb = np.array(b)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 50.0
    sim = float(np.dot(va, vb) / (norm_a * norm_b))
    return max(0.0, min(100.0, (sim + 1) / 2 * 100))


def experience_match_score(
    candidate_years: float | None,
    exp_min: int | None,
    exp_max: int | None,
) -> float:
    if candidate_years is None:
        return 40.0
    if exp_min is None and exp_max is None:
        return 75.0
    exp_min = exp_min or 0
    exp_max = exp_max or exp_min + 10
    if exp_min <= candidate_years <= exp_max:
        return 95.0
    if candidate_years < exp_min:
        gap = exp_min - candidate_years
        return max(20.0, 80.0 - gap * 15)
    over = candidate_years - exp_max
    return max(50.0, 90.0 - over * 5)


def location_match_score(
    candidate_location: str | None,
    candidate_remote_pref: str,
    job_location: str | None,
    job_remote: str,
    visa_status: str | None,
    visa_sponsorship: bool,
) -> float:
    score = 70.0
    if job_remote == "remote":
        if candidate_remote_pref in ("remote", "any"):
            score = 95.0
        else:
            score = 80.0
    elif job_remote == "hybrid":
        score = 75.0
    if visa_sponsorship and visa_status and "need" in visa_status.lower():
        score = min(100.0, score + 15)
    elif not visa_sponsorship and visa_status and "need" in visa_status.lower():
        score = max(20.0, score - 30)
    return score


def freshness_score(posted_at: str) -> float:
    try:
        posted = datetime.fromisoformat(posted_at.replace("Z", "+00:00"))
        days = (datetime.now(timezone.utc) - posted).days
        if days <= 3:
            return 95.0
        if days <= 7:
            return 85.0
        if days <= 14:
            return 70.0
        if days <= 30:
            return 55.0
        return 40.0
    except Exception:
        return 50.0


def competition_score(applicant_count: int | None) -> float:
    # Zero may mean a local counter or an unobserved external applicant pool.
    # Do not interpret it as verified low competition.
    if applicant_count is None or applicant_count <= 0:
        return 50.0
    if applicant_count <= 10:
        return 90.0
    if applicant_count <= 50:
        return 70.0
    if applicant_count <= 100:
        return 55.0
    if applicant_count <= 200:
        return 40.0
    return 25.0


SENIORITY_KEYWORDS: list[tuple[str, int]] = [
    ("intern", 0),
    ("junior", 1),
    ("associate", 1),
    ("entry", 1),
    ("mid", 2),
    ("senior", 3),
    ("sr.", 3),
    ("lead", 4),
    ("principal", 5),
    ("staff", 5),
    ("director", 6),
    ("head of", 6),
    ("vp", 7),
    ("vice president", 7),
]


def infer_seniority_level(title: str | None, years: float | None = None) -> int:
    if title:
        title_lower = title.lower()
        for keyword, level in SENIORITY_KEYWORDS:
            if keyword in title_lower:
                return level
    if years is not None:
        if years <= 2:
            return 1
        if years <= 5:
            return 2
        if years <= 8:
            return 3
        if years <= 12:
            return 4
        return 5
    return 2


def seniority_match_score(candidate_title: str | None, job_title: str, candidate_years: float | None) -> float:
    cand_level = infer_seniority_level(candidate_title, candidate_years)
    job_level = infer_seniority_level(job_title)
    diff = abs(cand_level - job_level)
    if diff == 0:
        return 95.0
    if diff == 1:
        return 80.0
    if diff == 2:
        return 60.0
    return max(30.0, 50.0 - diff * 10)


def compute_match_breakdown(
    candidate: dict[str, Any],
    job: dict[str, Any],
    candidate_skills: list[str],
    cv_score: float | None,
    cv_text: str = "",
) -> dict[str, float]:
    from app.scoring.jd_match_engine import compute_jd_match_breakdown
    from app.scoring.interview_signal_engine import compute_interview_signal, merge_match_result

    profile_cv = cv_score if cv_score is not None else 60.0
    jd_breakdown = compute_jd_match_breakdown(candidate, job, candidate_skills, cv_text)
    interview_signal = compute_interview_signal(
        jd_breakdown["jd_match_score"],
        profile_cv,
        job,
        candidate,
    )
    return merge_match_result(jd_breakdown, interview_signal, job)


async def generate_explanation(
    candidate: dict[str, Any],
    job: dict[str, Any],
    breakdown: dict[str, float],
    candidate_skills: list[str],
) -> dict[str, Any]:
    if not settings.openai_api_key:
        return _fallback_explanation(candidate, job, breakdown, candidate_skills)

    prompt = f"""Analyze this candidate-job match and return JSON with:
- summary: 2-3 sentence explanation of estimated interview probability
- strengths: array of 2-5 reasons they are likely to be considered
- gaps: array of 2-5 reasons probability may be reduced
- improvements: array of 2-4 actionable steps to improve shortlisting chance before applying
- competition_level: "low", "medium", or "high"

Candidate title: {candidate.get('current_title')}
Candidate skills: {', '.join(candidate_skills[:15])}
Candidate experience: {candidate.get('total_experience_years')} years
Target roles: {', '.join(candidate.get('target_roles') or [])}

Job: {job.get('title')}
Required skills: {', '.join(job.get('required_skills') or [])}
Nice-to-have: {', '.join(job.get('nice_to_have_skills') or [])}

Scores: skill={breakdown['skill_score']}, experience={breakdown['experience_score']}, final={breakdown['final_score']}

Use "estimated interview probability" language. Be specific and honest."""

    try:
        response = chat_completion(
            messages=[
                {"role": "system", "content": "You are a career matching expert. Return valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            feature="match_explanation",
            candidate_id=candidate.get("id"),
        )
        import json
        return json.loads(response.choices[0].message.content or "{}")
    except BudgetExceeded:
        raise
    except Exception:
        return _fallback_explanation(candidate, job, breakdown, candidate_skills)


def _fallback_explanation(
    candidate: dict[str, Any],
    job: dict[str, Any],
    breakdown: dict[str, float],
    candidate_skills: list[str],
) -> dict[str, Any]:
    req = set(s.lower() for s in (job.get("required_skills") or []))
    cand = set(s.lower() for s in candidate_skills)
    matched = req & cand
    missing = req - cand

    strengths = []
    if matched:
        strengths.append(f"Strong match on: {', '.join(list(matched)[:4])}")
    if breakdown["experience_score"] >= 75:
        strengths.append("Experience level aligns well with role requirements")
    if breakdown["role_similarity_score"] >= 70:
        strengths.append("Profile shows semantic similarity to job description")

    gaps = []
    if missing:
        gaps.append(f"Not recorded in structured skills: {', '.join(list(missing)[:4])}")
    if breakdown["location_score"] < 60:
        gaps.append("Location or work authorization may reduce shortlisting likelihood")

    return {
        "summary": f"Interview Signal is {breakdown.get('interview_signal', breakdown['final_score']):.0f}/100 based on JD match, CV score, and job context.",
        "strengths": strengths,
        "gaps": gaps,
        "improvements": [
            "Highlight matching skills in CV summary",
            "Add quantified achievements for relevant experience",
        ],
        "competition_level": "medium",
    }


def categorize_match(final_score: float, skill_score: float, visa_sponsorship: bool) -> str | None:
    if visa_sponsorship and final_score >= 55:
        return "visa_friendly"
    if final_score >= 70:
        return "best_match"
    if final_score >= 50 and skill_score >= 60:
        return "stretch"
    return None
