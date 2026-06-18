import re
from typing import Any

from app.parser.cv_parser import ParsedCV, compute_ats_score
from app.matching.skill_graph import expand_skills, normalize_skills


def _impact_metrics_score(text: str, achievements: list[str]) -> float:
    combined = text + " " + " ".join(achievements)
    numbers = len(re.findall(r"\d+%|\d+\+|\$[\d,]+|\d+\s*(?:years|months|k|m)", combined, re.I))
    if numbers >= 8:
        return 95.0
    if numbers >= 4:
        return 75.0
    if numbers >= 2:
        return 55.0
    return 35.0


def _keyword_strength_score(skills: list[str], target_roles: list[str], text: str) -> float:
    if not target_roles:
        return 65.0
    text_lower = text.lower()
    hits = 0
    for role in target_roles:
        tokens = [t for t in role.lower().split() if len(t) > 3]
        if any(t in text_lower for t in tokens):
            hits += 1
    return min(100.0, 40.0 + (hits / max(len(target_roles), 1)) * 60)


def _role_clarity_score(current_title: str | None, summary: str | None, target_roles: list[str]) -> float:
    score = 50.0
    if current_title:
        score += 20.0
    if summary and len(summary) > 80:
        score += 15.0
    if target_roles:
        title_lower = (current_title or "").lower()
        if any(r.lower() in title_lower or title_lower in r.lower() for r in target_roles):
            score += 15.0
    return min(100.0, score)


def _formatting_score(text: str) -> float:
    score = 60.0
    bullets = len(re.findall(r"^[\•\-\*]", text, re.MULTILINE))
    if bullets >= 8:
        score += 20.0
    elif bullets >= 4:
        score += 10.0
    if 400 < len(text) < 8000:
        score += 10.0
    sections = sum(1 for s in ["experience", "education", "skills", "summary"] if s in text.lower())
    score += sections * 2.5
    return min(100.0, score)


def _seniority_signal_score(seniority: str | None, years: float | None) -> float:
    if seniority in ("senior", "lead", "principal"):
        return 85.0
    if seniority == "mid":
        return 70.0
    if years and years >= 8:
        return 80.0
    if years and years >= 4:
        return 65.0
    return 50.0


def _skill_relevance_score(skills: list[str], target_roles: list[str]) -> float:
    if not skills:
        return 40.0
    if len(skills) >= 8:
        return min(100.0, 60.0 + len(skills))
    return 55.0


def _readability_score(text: str, summary: str | None) -> float:
    lines = [l for l in text.split("\n") if l.strip()]
    avg_len = sum(len(l) for l in lines) / max(len(lines), 1)
    score = 70.0
    if 30 < avg_len < 120:
        score += 15.0
    if summary and 50 < len(summary) < 400:
        score += 15.0
    return min(100.0, score)


def compute_cv_score_breakdown(
    parsed_text: str,
    parsed: dict[str, Any],
    skills: list[str],
    target_roles: list[str] | None = None,
) -> dict[str, Any]:
    target_roles = target_roles or []
    achievements: list[str] = []
    for exp in parsed.get("experience") or []:
        achievements.extend(exp.get("achievements") or [])

    from app.parser.cv_parser import ParsedExperience
    try:
        parsed_model = ParsedCV(
            name=parsed.get("name"),
            email=parsed.get("email"),
            current_title=parsed.get("current_title"),
            profile_summary=parsed.get("profile_summary"),
            skills=skills,
            seniority=parsed.get("seniority"),
            total_experience_years=parsed.get("total_experience_years"),
            experience=[ParsedExperience(**e) for e in (parsed.get("experience") or []) if isinstance(e, dict)],
        )
    except Exception:
        parsed_model = ParsedCV(skills=skills, profile_summary=parsed.get("profile_summary"))

    ats = compute_ats_score(parsed_text, parsed_model)

    breakdown = {
        "ats_parseability": round(ats, 1),
        "formatting": round(_formatting_score(parsed_text), 1),
        "keyword_strength": round(_keyword_strength_score(skills, target_roles, parsed_text), 1),
        "impact_metrics": round(_impact_metrics_score(parsed_text, achievements), 1),
        "role_clarity": round(_role_clarity_score(parsed.get("current_title"), parsed.get("profile_summary"), target_roles), 1),
        "seniority_signal": round(_seniority_signal_score(parsed.get("seniority"), parsed.get("total_experience_years")), 1),
        "skill_relevance": round(_skill_relevance_score(skills, target_roles), 1),
        "readability": round(_readability_score(parsed_text, parsed.get("profile_summary")), 1),
    }

    overall = (
        breakdown["ats_parseability"] * 0.15
        + breakdown["formatting"] * 0.10
        + breakdown["keyword_strength"] * 0.15
        + breakdown["impact_metrics"] * 0.20
        + breakdown["role_clarity"] * 0.15
        + breakdown["seniority_signal"] * 0.10
        + breakdown["skill_relevance"] * 0.10
        + breakdown["readability"] * 0.05
    )

    feedback = _build_feedback(breakdown, parsed, skills, target_roles)

    return {
        "overall_score": round(overall, 1),
        "breakdown": breakdown,
        "feedback": feedback,
    }


def _build_feedback(
    breakdown: dict[str, float],
    parsed: dict[str, Any],
    skills: list[str],
    target_roles: list[str],
) -> dict[str, Any]:
    good: list[str] = []
    weak: list[str] = []
    rewrite: list[str] = []
    missing_keywords: list[str] = []

    if breakdown["impact_metrics"] >= 70:
        good.append("Achievements include measurable business impact")
    else:
        weak.append("Bullets lack quantified outcomes (%, $, scale)")
        rewrite.append("Add metrics to top 3 experience bullets")

    if breakdown["ats_parseability"] >= 75:
        good.append("CV structure is ATS-friendly")
    else:
        weak.append("CV may not parse well in applicant tracking systems")

    if breakdown["keyword_strength"] < 65 and target_roles:
        missing_keywords.extend([r for r in target_roles[:3]])
        rewrite.append(f"Align summary with target role: {target_roles[0]}")

    if breakdown["role_clarity"] < 65:
        weak.append("Current title or summary does not clearly position you for target roles")

    if len(skills) > 15:
        weak.append("Too many tools listed without context")

    gaps = parsed.get("gaps") or []
    weak.extend(gaps[:2])

    return {
        "good": good or ["Relevant professional experience detected"],
        "weak": weak or ["Room to strengthen role-specific keywords"],
        "rewrite": rewrite or ["Sharpen professional summary for your target role"],
        "missing_keywords": missing_keywords,
    }
