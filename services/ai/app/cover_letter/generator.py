"""AI cover-letter generation (Pro feature)."""
import json
from typing import Any

from app.budget import BudgetExceeded
from app.config import settings
from app.openai_client import chat_completion

TONES = {
    "concise": "concise and direct — short paragraphs, no filler",
    "warm": "warm and personable while staying professional",
    "formal": "formal and polished",
    "enthusiastic": "enthusiastic and energetic, conveying genuine excitement",
}


async def generate_cover_letter(
    cv_text: str,
    candidate: dict[str, Any],
    job_title: str,
    company_name: str,
    jd_text: str,
    tone: str = "warm",
) -> dict[str, Any]:
    tone_desc = TONES.get(tone, TONES["warm"])

    if not settings.openai_api_key:
        return {"content": _fallback(candidate, job_title, company_name, tone)}

    try:
        resp = chat_completion(
            feature="cover_letter",
            candidate_id=candidate.get("id"),
            messages=[
                {"role": "system", "content": (
                    "You are an expert career writer. Write a tailored, one-page cover letter "
                    f"that is {tone_desc}. Ground every claim in the candidate's actual CV; never "
                    "invent employers, titles, or metrics. 3-4 short paragraphs. Return STRICT JSON only."
                )},
                {"role": "user", "content": (
                    f"Role: {job_title}\nCompany: {company_name or 'the company'}\n\n"
                    f"Job description:\n{jd_text[:3000]}\n\n"
                    f"Candidate CV:\n{cv_text[:3500]}\n\n"
                    'Return JSON: {"content": "<the full cover letter text with \\n line breaks>"}'
                )},
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=900,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        content = str(data.get("content") or "").strip()
        if not content:
            return {"content": _fallback(candidate, job_title, company_name, tone)}
        return {"content": content}
    except BudgetExceeded:
        raise
    except Exception:
        return {"content": _fallback(candidate, job_title, company_name, tone)}


def _fallback(candidate: dict[str, Any], job_title: str, company_name: str, tone: str) -> str:
    title = candidate.get("current_title") or "an experienced professional"
    company = company_name or "your team"
    role = job_title or "this role"
    return (
        f"Dear Hiring Manager,\n\n"
        f"I'm excited to apply for {role} at {company}. As {title}, I bring directly relevant "
        f"experience and a track record of measurable impact.\n\n"
        f"In my recent work I have [describe a key achievement with a metric you can verify], and I am "
        f"confident I can deliver similar outcomes for {company}. My background aligns closely with what "
        f"this role requires.\n\n"
        f"I would welcome the opportunity to discuss how I can contribute. Thank you for your consideration.\n\n"
        f"Sincerely,\n{candidate.get('full_name') or 'Your Name'}\n\n"
        f"[This is a draft — replace the bracketed placeholders with your real, verifiable details.]"
    )
