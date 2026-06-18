import json
from typing import Any

from app.config import settings
from app.matching.engine import generate_embedding
from app.matching.skill_graph import extract_skills_from_text, normalize_skills
from app.openai_client import get_openai, resolve_model


async def analyze_cv_job_gap(
    candidate: dict[str, Any],
    job: dict[str, Any],
    cv_text: str,
    candidate_skills: list[str],
    current_fit: float,
) -> dict[str, Any]:
    if not settings.openai_api_key:
        return _fallback_gap_analysis(job, candidate_skills, current_fit)

    client = get_openai()
    prompt = f"""Analyze CV fit for this job. Return JSON:
{{
  "missing_keywords": [],
  "weak_bullets": [],
  "skills_to_add": [],
  "suggested_summary": "",
  "suggested_bullets": [],
  "current_fit": {current_fit},
  "projected_fit": 0,
  "ats_match_score": 0,
  "recruiter_readability_score": 0,
  "risk_notes": []
}}

Only suggest skills the candidate could truthfully add based on their background.

Job: {job.get('title')}
Required: {', '.join(job.get('required_skills') or [])}
Nice-to-have: {', '.join(job.get('nice_to_have_skills') or [])}
Candidate skills: {', '.join(candidate_skills)}
CV excerpt: {cv_text[:4000]}"""

    try:
        response = client.chat.completions.create(
            model=resolve_model(settings.llm_model),
            messages=[
                {"role": "system", "content": "Career coach analyzing CV-job fit. Return valid JSON."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        result = json.loads(response.choices[0].message.content or "{}")
        result["current_fit"] = current_fit
        result["projected_fit"] = result.get("projected_fit", min(95, current_fit + 15))
        return result
    except Exception:
        return _fallback_gap_analysis(job, candidate_skills, current_fit)


def _fallback_gap_analysis(
    job: dict[str, Any],
    candidate_skills: list[str],
    current_fit: float,
) -> dict[str, Any]:
    req = normalize_skills(job.get("required_skills") or [])
    cand_lower = {s.lower() for s in candidate_skills}
    missing = [s for s in req if s.lower() not in cand_lower]

    return {
        "missing_keywords": missing[:8],
        "weak_bullets": ["Add quantified impact metrics to recent role bullets"],
        "skills_to_add": missing[:4],
        "suggested_summary": f"Experienced professional targeting {job.get('title')} roles with expertise in {', '.join(candidate_skills[:5])}.",
        "suggested_bullets": [
            f"Led initiatives involving {missing[0]}" if missing else "Delivered measurable business outcomes",
            "Collaborated cross-functionally to ship products on schedule",
        ],
        "current_fit": current_fit,
        "projected_fit": min(95, current_fit + 18),
        "ats_match_score": current_fit,
        "recruiter_readability_score": 70,
        "risk_notes": ["Ensure all suggested skills are truthfully represented"],
    }


async def parse_job_description(title: str, description: str) -> dict[str, Any]:
    skills = extract_skills_from_text(f"{title} {description}")
    required = skills[:8]
    nice = skills[8:15]
    embedding = await generate_embedding(f"{title} {description[:3000]}")
    return {
        "required_skills": required,
        "nice_to_have_skills": nice,
        "embedding": embedding,
    }
