import json
from typing import Any

from app import db as sqlite_db
from app.config import settings
from app.openai_client import get_openai, resolve_model


async def generate_interview_prep(candidate_id: str, job_id: str | None = None) -> dict[str, Any]:
    candidate = sqlite_db.get_candidate(candidate_id)
    if not candidate:
        raise ValueError("Candidate not found")

    skills = sqlite_db.get_candidate_skills(candidate_id)
    cv_text = sqlite_db.get_primary_cv_text(candidate_id) or candidate.get("profile_summary") or ""

    job: dict[str, Any] | None = None
    company: dict[str, Any] | None = None
    if job_id:
        job = sqlite_db.get_job(job_id)
        company = sqlite_db.get_company_for_job(job_id) if job else None

    if not settings.openai_api_key:
        return _fallback_prep(candidate, job, company, skills)

    job_title = job["title"] if job else (candidate.get("target_roles") or ["your target role"])[0]
    company_name = company["name"] if company else "the company"
    job_desc = (job.get("description") or "")[:3000] if job else ""

    prompt = f"""Generate interview prep content. Return JSON:
{{
  "questions": [
    {{"question": "...", "category": "behavioral|technical|role", "tips": "..."}}
  ],
  "company_summary": "2-3 paragraph summary of company context and what they likely value",
  "plan_30_90": "Markdown plan for 30/60/90 day preparation milestones",
  "readiness_score": 0-100
}}

Role: {job_title}
Company: {company_name}
Required skills: {', '.join(job.get('required_skills') or []) if job else ', '.join(skills[:8])}
Job description excerpt: {job_desc or 'General role prep'}
Candidate title: {candidate.get('current_title')}
Candidate skills: {', '.join(skills[:15])}
CV excerpt: {cv_text[:2000]}

Include 8-10 interview questions mixing behavioral, technical, and role-specific."""

    client = get_openai()
    try:
        response = client.chat.completions.create(
            model=resolve_model(settings.llm_model),
            messages=[
                {"role": "system", "content": "You are an interview coach. Return valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
        )
        result = json.loads(response.choices[0].message.content or "{}")
        return {
            "questions": result.get("questions") or [],
            "company_summary": result.get("company_summary") or "",
            "plan_30_90": result.get("plan_30_90") or "",
            "readiness_score": float(result.get("readiness_score") or 70),
        }
    except Exception:
        return _fallback_prep(candidate, job, company, skills)


def _fallback_prep(
    candidate: dict[str, Any],
    job: dict[str, Any] | None,
    company: dict[str, Any] | None,
    skills: list[str],
) -> dict[str, Any]:
    title = job["title"] if job else (candidate.get("target_roles") or ["this role"])[0]
    company_name = company["name"] if company else "the hiring company"
    req_skills = job.get("required_skills") if job else skills[:5]

    questions = [
        {
            "question": f"Tell me about a time you delivered impact relevant to {title}.",
            "category": "behavioral",
            "tips": "Use STAR format with metrics.",
        },
        {
            "question": f"Why do you want to join {company_name}?",
            "category": "role",
            "tips": "Research company mission and tie to your goals.",
        },
        {
            "question": f"How would you apply {req_skills[0] if req_skills else 'your core skills'} in this role?",
            "category": "technical",
            "tips": "Give a concrete example from past work.",
        },
    ]

    return {
        "questions": questions,
        "company_summary": (
            f"{company_name} is hiring for {title}. "
            f"Prepare examples showing {', '.join(req_skills[:4]) or 'relevant experience'}."
        ),
        "plan_30_90": (
            "**Days 1-30:** Research company, refine STAR stories, mock interviews.\n\n"
            "**Days 31-60:** Deep-dive role skills, practice system design or case questions.\n\n"
            "**Days 61-90:** Final mock rounds, refine weak areas, prepare thoughtful questions."
        ),
        "readiness_score": 65.0,
    }
