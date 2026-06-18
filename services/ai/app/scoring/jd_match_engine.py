import re
from typing import Any

from app.matching.engine import (
    cosine_similarity,
    experience_match_score,
    location_match_score,
    seniority_match_score,
)
from app.matching.skill_graph import expand_skills, extract_skills_from_text, skill_match_score


def _required_skills_score(candidate_skills: list[str], required: list[str]) -> float:
    if not required:
        return 75.0
    cand = expand_skills(candidate_skills)
    req = expand_skills(required)
    matches = sum(1 for s in req if s in cand)
    return (matches / len(req)) * 100


def _nice_to_have_score(candidate_skills: list[str], nice: list[str]) -> float:
    if not nice:
        return 70.0
    cand = expand_skills(candidate_skills)
    n = expand_skills(nice)
    matches = sum(1 for s in n if s in cand)
    return (matches / len(n)) * 100


def _keyword_match_score(cv_text: str, jd_text: str) -> float:
    stop = {"the", "and", "for", "with", "you", "will", "our", "are", "this", "that", "from", "have", "your"}
    jd_tokens = set(re.findall(r"[a-zA-Z]{3,}", jd_text.lower())) - stop
    cv_tokens = set(re.findall(r"[a-zA-Z]{3,}", cv_text.lower())) - stop
    if not jd_tokens:
        return 60.0
    overlap = len(jd_tokens & cv_tokens)
    return min(100.0, (overlap / len(jd_tokens)) * 100 * 1.2)


def _salary_notice_score(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    score = 70.0
    sal = candidate.get("salary_expectation")
    jmin = job.get("salary_min")
    jmax = job.get("salary_max")
    if sal and jmin and jmax:
        if jmin <= sal <= jmax:
            score = 95.0
        elif sal <= jmax * 1.15:
            score = 75.0
        else:
            score = 45.0
    if candidate.get("notice_period"):
        score = min(100.0, score + 5)
    return score


def compute_jd_match_breakdown(
    candidate: dict[str, Any],
    job: dict[str, Any],
    candidate_skills: list[str],
    cv_text: str = "",
) -> dict[str, float]:
    required = job.get("required_skills") or []
    nice = job.get("nice_to_have_skills") or []
    jd_text = f"{job.get('title', '')} {job.get('description', '')}"

    req_skills = _required_skills_score(candidate_skills, required)
    exp = experience_match_score(
        float(candidate.get("total_experience_years") or 0) or None,
        job.get("experience_min"),
        job.get("experience_max"),
    )
    role_sim = cosine_similarity(candidate.get("embedding"), job.get("embedding"))

    domain_job_skills = expand_skills(required + (job.get("tech_stack") or []))
    domain_cand = expand_skills(candidate_skills)
    domain = (len(domain_cand & domain_job_skills) / len(domain_job_skills)) * 100 if domain_job_skills else 60.0

    seniority = seniority_match_score(
        candidate.get("current_title"),
        job.get("title", ""),
        float(candidate.get("total_experience_years") or 0) if candidate.get("total_experience_years") else None,
    )
    keyword = _keyword_match_score(cv_text or candidate.get("profile_summary") or "", jd_text)
    location = location_match_score(
        candidate.get("location"),
        candidate.get("remote_preference", "any"),
        job.get("location"),
        job.get("remote_type", "onsite"),
        candidate.get("visa_status"),
        job.get("visa_sponsorship", False),
    )
    salary_notice = _salary_notice_score(candidate, job)
    nice_score = _nice_to_have_score(candidate_skills, nice)

    jd_match = (
        req_skills * 0.25
        + exp * 0.20
        + role_sim * 0.15
        + domain * 0.10
        + seniority * 0.10
        + keyword * 0.10
        + location * 0.05
        + salary_notice * 0.05
    )

    legacy_skill = skill_match_score(candidate_skills, required, nice)

    return {
        "required_skills_score": round(req_skills, 1),
        "nice_to_have_score": round(nice_score, 1),
        "experience_score": round(exp, 1),
        "role_similarity_score": round(role_sim, 1),
        "domain_score": round(domain, 1),
        "seniority_score": round(seniority, 1),
        "keyword_match_score": round(keyword, 1),
        "location_visa_score": round(location, 1),
        "salary_notice_score": round(salary_notice, 1),
        "jd_match_score": round(jd_match, 1),
        "skill_score": round(legacy_skill, 1),
        "location_score": round(location, 1),
        "cv_score": round(keyword, 1),
    }


def job_dict_from_jd_text(jd_text: str, title: str = "Pasted Job") -> dict[str, Any]:
    skills = extract_skills_from_text(f"{title} {jd_text}")
    return {
        "id": "pasted",
        "title": title,
        "description": jd_text,
        "required_skills": skills[:8],
        "nice_to_have_skills": skills[8:15],
        "embedding": None,
        "location": None,
        "remote_type": "onsite",
        "experience_min": None,
        "experience_max": None,
        "visa_sponsorship": False,
        "salary_min": None,
        "salary_max": None,
        "applicant_count": 50,
        "posted_at": "",
    }
