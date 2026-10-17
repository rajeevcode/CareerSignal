from typing import Any

from app import db as sqlite_db
from app.budget import BudgetExceeded
from app.config import settings
from app.openai_client import chat_completion


async def coach_chat(candidate_id: str, message: str) -> str:
    candidate = sqlite_db.get_candidate(candidate_id)
    if not candidate:
        return "I couldn't find your profile. Please complete onboarding first."

    skills = sqlite_db.get_candidate_skills(candidate_id)
    history = sqlite_db.list_coach_messages(candidate_id, limit=10)
    cv_text = sqlite_db.get_primary_cv_text(candidate_id) or candidate.get("profile_summary") or ""

    if not settings.openai_api_key:
        return _fallback_response(candidate, message)

    system = (
        "You are CareerSignal's AI career coach. Give practical, encouraging advice on "
        "job search, interviews, CV improvements, and career growth. Be concise and actionable."
    )
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]

    context = (
        f"Candidate: {candidate.get('current_title') or 'Not specified'}\n"
        f"Experience: {candidate.get('total_experience_years') or 'Unknown'} years\n"
        f"Target roles: {', '.join(candidate.get('target_roles') or []) or 'Not specified'}\n"
        f"Skills: {', '.join(skills[:15]) or 'None listed'}\n"
        f"CV excerpt: {cv_text[:1500]}"
    )
    messages.append({"role": "system", "content": f"Candidate context:\n{context}"})

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": message})

    try:
        response = chat_completion(
            messages=messages,
            temperature=0.6,
            feature="coach_chat",
            candidate_id=candidate_id,
        )
        return response.choices[0].message.content or _fallback_response(candidate, message)
    except BudgetExceeded:
        # Don't mask a budget stop as a generic fallback — let it surface as 503.
        raise
    except Exception:
        return _fallback_response(candidate, message)


def _fallback_response(candidate: dict[str, Any], message: str) -> str:
    title = candidate.get("current_title") or "your target role"
    return (
        f"Thanks for your question about \"{message[:80]}\". "
        f"Focus on tailoring your CV for {title}, highlighting quantified achievements, "
        "and preparing 3-4 STAR stories for common behavioral questions. "
        "Connect with me again once AI is configured for deeper guidance."
    )
