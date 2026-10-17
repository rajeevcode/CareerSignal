"""Mock interview studio: opener question, STAR answer scoring, next question, summary."""
import json
from typing import Any

from app.budget import BudgetExceeded
from app.config import settings
from app.openai_client import chat_completion

TOTAL_TURNS = 5

MODE_GUIDE = {
    "behavioral": "behavioral questions about past experience, teamwork, conflict, and impact (STAR-friendly)",
    "technical": "role-specific technical and problem-solving questions",
    "company": "company- and role-fit questions, motivation, and domain knowledge",
}


async def start_interview(role_title: str, company_name: str | None, mode: str, difficulty: str) -> dict[str, Any]:
    if not settings.openai_api_key:
        return {"question": _fallback_question(role_title, mode, [])}
    try:
        resp = chat_completion(
            feature="interview_start",
            messages=[
                {"role": "system", "content": "You are a senior interviewer. Output STRICT JSON: {\"question\": string}."},
                {"role": "user", "content": (
                    f"Role: {role_title}{f' at {company_name}' if company_name else ''}\n"
                    f"Mode: {mode} ({MODE_GUIDE.get(mode, '')})\nDifficulty: {difficulty}\n\n"
                    "Ask ONE strong opening interview question appropriate for this mode."
                )},
            ],
            response_format={"type": "json_object"},
            temperature=0.6,
            max_tokens=300,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        q = str(data.get("question") or "").strip()
        return {"question": q or _fallback_question(role_title, mode, [])}
    except BudgetExceeded:
        raise
    except Exception:
        return {"question": _fallback_question(role_title, mode, [])}


async def score_answer(role_title: str, mode: str, question: str, answer: str) -> dict[str, Any]:
    if not settings.openai_api_key:
        return _fallback_score()
    try:
        resp = chat_completion(
            feature="interview_answer",
            messages=[
                {"role": "system", "content": (
                    "You are an expert interview coach. Score the answer with the STAR framework "
                    "(Situation, Task, Action, Result), each 0-100. Output STRICT JSON: "
                    '{"score": int(0-100), "strengths": [string], "improvements": [string], '
                    '"star": {"situation": int, "task": int, "action": int, "result": int}}.'
                )},
                {"role": "user", "content": (
                    f"Role: {role_title}\nMode: {mode}\nQuestion: {question}\n\nCandidate answer:\n{answer[:2000]}"
                )},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=500,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        star = data.get("star") or {}
        return {
            "score": _clamp(data.get("score"), 100),
            "strengths": [str(s).strip() for s in (data.get("strengths") or []) if str(s).strip()][:5],
            "improvements": [str(s).strip() for s in (data.get("improvements") or []) if str(s).strip()][:5],
            "star": {
                "situation": _clamp(star.get("situation"), 100),
                "task": _clamp(star.get("task"), 100),
                "action": _clamp(star.get("action"), 100),
                "result": _clamp(star.get("result"), 100),
            },
        }
    except BudgetExceeded:
        raise
    except Exception:
        return _fallback_score()


async def next_question(role_title: str, mode: str, difficulty: str, asked_questions: list[str]) -> dict[str, Any]:
    done = len(asked_questions) >= TOTAL_TURNS
    if done:
        return {"question": None, "done": True}
    if not settings.openai_api_key:
        return {"question": _fallback_question(role_title, mode, asked_questions), "done": False}
    try:
        asked = "\n".join(f"- {q}" for q in asked_questions) or "(none yet)"
        resp = chat_completion(
            feature="interview_next",
            messages=[
                {"role": "system", "content": "You are a senior interviewer. Output STRICT JSON: {\"question\": string}."},
                {"role": "user", "content": (
                    f"Role: {role_title}\nMode: {mode} ({MODE_GUIDE.get(mode, '')})\nDifficulty: {difficulty}\n\n"
                    f"Already asked:\n{asked}\n\nAsk ONE NEW, different question. Do not repeat themes."
                )},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=300,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        q = str(data.get("question") or "").strip()
        return {"question": q or _fallback_question(role_title, mode, asked_questions), "done": False}
    except BudgetExceeded:
        raise
    except Exception:
        return {"question": _fallback_question(role_title, mode, asked_questions), "done": False}


async def summarize_session(role_title: str, qa_pairs: list[dict[str, str]], avg_score: float) -> dict[str, Any]:
    if not settings.openai_api_key or not qa_pairs:
        return {"summary": _fallback_summary(avg_score)}
    try:
        transcript = "\n\n".join(
            f"Q: {p.get('question', '')}\nA: {p.get('answer', '')}" for p in qa_pairs[:8]
        )
        resp = chat_completion(
            feature="interview_summary",
            messages=[
                {"role": "system", "content": "You are an interview coach. Output STRICT JSON: {\"summary\": string}."},
                {"role": "user", "content": (
                    f"Role: {role_title}\nAverage answer score: {round(avg_score)}/100\n\n"
                    f"Transcript:\n{transcript[:3500]}\n\n"
                    "Write a 3-4 sentence performance summary: overall readiness, top strength, and the "
                    "single most important thing to improve before the real interview."
                )},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
            max_tokens=300,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        return {"summary": str(data.get("summary") or "").strip() or _fallback_summary(avg_score)}
    except BudgetExceeded:
        raise
    except Exception:
        return {"summary": _fallback_summary(avg_score)}


def _clamp(v: Any, hi: int) -> int:
    try:
        return max(0, min(hi, int(round(float(v)))))
    except (TypeError, ValueError):
        return 0


_FALLBACK_QS = {
    "behavioral": [
        "Tell me about a time you led a project through significant ambiguity. What did you do?",
        "Describe a conflict with a stakeholder and how you resolved it.",
        "Walk me through your biggest measurable impact and how you achieved it.",
        "Tell me about a time you failed. What did you learn?",
        "How do you prioritize when everything feels urgent?",
    ],
    "technical": [
        "How would you design a system to rank jobs for a candidate at scale?",
        "Explain a tradeoff you made between speed and quality, and why.",
        "How do you validate that a new feature is actually working?",
        "Describe how you'd debug a sudden drop in a key metric.",
        "What's your approach to breaking an ambiguous problem into shippable pieces?",
    ],
    "company": [
        "Why this role, and why now?",
        "What do you know about our product and market?",
        "Where do you want to grow in the next two years?",
        "What would you focus on in your first 90 days?",
        "What questions do you have for us?",
    ],
}


def _fallback_question(role_title: str, mode: str, asked: list[str]) -> str:
    pool = _FALLBACK_QS.get(mode, _FALLBACK_QS["behavioral"])
    idx = len(asked) % len(pool)
    return pool[idx]


def _fallback_score() -> dict[str, Any]:
    return {
        "score": 60,
        "strengths": ["Clear structure"],
        "improvements": ["Add a specific, quantified result", "Tighten the situation/task setup"],
        "star": {"situation": 60, "task": 60, "action": 65, "result": 50},
    }


def _fallback_summary(avg_score: float) -> str:
    band = "strong" if avg_score >= 75 else "solid" if avg_score >= 55 else "developing"
    return (
        f"Overall a {band} performance (~{round(avg_score)}/100). Your structure is reasonable; "
        "the biggest win before the real interview is to attach a concrete, quantified result to "
        "every answer using the STAR framework."
    )
