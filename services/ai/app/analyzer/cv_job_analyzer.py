import json
import re
from typing import Any

from app.config import settings
from app.matching.engine import generate_embedding
from app.matching.skill_graph import extract_skills_from_text, normalize_skills
from app.budget import BudgetExceeded
from app.openai_client import chat_completion

PLACEHOLDER_RE = re.compile(r"\[[^\]]+\]")

ROLE_STYLE_LABELS = {
    "ai_product_manager": "AI Product Manager",
    "technical_product_manager": "Technical Product Manager",
    "data_product_manager": "Data Product Manager",
    "product_owner": "Product Owner",
    "growth_product_manager": "Growth Product Manager",
    "program_manager": "Program Manager",
}

ROLE_STYLE_GUIDES = {
    "ai_product_manager": "LLM/ML lifecycle, eval frameworks, model latency/cost, RAG, prompt systems, AI workflows, data flywheel, 0->1 AI features",
    "technical_product_manager": "APIs, platform/infrastructure, system design tradeoffs, latency/uptime SLOs, developer experience, technical architecture",
    "data_product_manager": "data pipelines, experimentation, metrics/instrumentation, self-serve analytics, data quality, SQL-driven decisioning",
    "product_owner": "backlog ownership, sprint velocity, acceptance criteria, stakeholder alignment, agile delivery, release predictability",
    "growth_product_manager": "activation, retention, funnel conversion, A/B testing, CAC/LTV, north-star metric, lifecycle marketing",
    "program_manager": "cross-team coordination, dependency and risk management, roadmap delivery, on-time launches, operational rigor",
}

STRONG_VERBS = ["Drove", "Led", "Shipped", "Architected", "Scaled", "Launched", "Built", "Owned"]

ACTION_MODES = {"regenerate", "senior", "concise"}


def _role_label(role_style: str) -> str:
    return ROLE_STYLE_LABELS.get(role_style, "Product Manager")


def _role_guide(role_style: str) -> str:
    return ROLE_STYLE_GUIDES.get(role_style, ROLE_STYLE_GUIDES["ai_product_manager"])


def _clamp_impact(value: Any, hi: int = 15) -> int:
    try:
        return max(0, min(hi, int(round(float(value)))))
    except (TypeError, ValueError):
        return 0


def _normalize_score_impact(raw: Any) -> dict[str, int]:
    raw = raw if isinstance(raw, dict) else {}
    return {
        "jd_match": _clamp_impact(raw.get("jd_match", 0)),
        "ats": _clamp_impact(raw.get("ats", 0)),
        "recruiter_scan": _clamp_impact(raw.get("recruiter_scan", 0)),
    }


def _normalize_rewrite(raw: dict[str, Any], index: int, fallback_before: str = "") -> dict[str, Any]:
    after = str(raw.get("after") or "").strip()
    return {
        "id": f"br-{index}",
        "before": str(raw.get("before") or fallback_before or "").strip(),
        "issue": str(raw.get("issue") or "Too vague — missing ownership, scale, or measurable impact.").strip(),
        "after": after,
        "keywords_added": [str(k).strip() for k in (raw.get("keywords_added") or []) if str(k).strip()][:8],
        "score_impact": _normalize_score_impact(raw.get("score_impact")),
        "is_placeholder": bool(PLACEHOLDER_RE.search(after)),
    }


def _finalize_gap(result: dict[str, Any], current_fit: float, role_style: str) -> dict[str, Any]:
    rewrites = result.get("bullet_rewrites")
    rewrites = rewrites if isinstance(rewrites, list) else []
    normalized = [
        _normalize_rewrite(r, i)
        for i, r in enumerate(rewrites)
        if isinstance(r, dict) and str(r.get("after") or "").strip()
    ]

    jd_gain = sum(r["score_impact"]["jd_match"] for r in normalized)
    projected = result.get("projected_fit")
    if not isinstance(projected, (int, float)) or projected <= current_fit:
        projected = current_fit + (jd_gain if jd_gain else 15)

    ats = result.get("ats_match_score")
    if not isinstance(ats, (int, float)) or ats <= 0:
        ats = current_fit

    readability = result.get("recruiter_readability_score")
    if not isinstance(readability, (int, float)) or readability <= 0:
        readability = 70

    has_placeholder = any(r["is_placeholder"] for r in normalized) or PLACEHOLDER_RE.search(
        str(result.get("suggested_summary") or "")
    )
    warning = (
        "Some rewrites contain placeholder metrics in [brackets] — replace them with your real numbers before using."
        if has_placeholder
        else ""
    )

    return {
        "missing_keywords": [str(k).strip() for k in (result.get("missing_keywords") or []) if str(k).strip()][:10],
        "skills_to_add": [str(k).strip() for k in (result.get("skills_to_add") or []) if str(k).strip()][:6],
        "suggested_summary": str(result.get("suggested_summary") or "").strip(),
        "suggested_bullets": [r["after"] for r in normalized],
        "weak_bullets": [r["before"] for r in normalized if r["before"]],
        "bullet_rewrites": normalized,
        "current_fit": round(float(current_fit), 1),
        "projected_fit": min(100, round(float(projected), 1)),
        "ats_match_score": min(100, round(float(ats), 1)),
        "recruiter_readability_score": min(100, round(float(readability), 1)),
        "risk_notes": [str(n).strip() for n in (result.get("risk_notes") or []) if str(n).strip()]
        or ["Only use metrics and skills you can honestly support in interviews."],
        "role_style": role_style,
        "truthfulness_warning": warning,
    }


async def analyze_cv_job_gap(
    candidate: dict[str, Any],
    job: dict[str, Any],
    cv_text: str,
    candidate_skills: list[str],
    current_fit: float,
    role_style: str = "ai_product_manager",
    cv_bullets: list[str] | None = None,
) -> dict[str, Any]:
    cv_bullets = [b for b in (cv_bullets or []) if b and b.strip()][:8]

    if not settings.openai_api_key:
        return _fallback_gap_analysis(job, candidate_skills, current_fit, role_style, cv_bullets, cv_text)

    role_label = _role_label(role_style)
    role_guide = _role_guide(role_style)
    numbered = "\n".join(f"{i + 1}. {b}" for i, b in enumerate(cv_bullets)) or "(no bullets extracted — infer 3 likely bullets from the CV excerpt)"

    system = (
        "You are a senior FAANG resume coach. You rewrite CV bullets into the X-Y-Z format: "
        "\"Accomplished X, as measured by Y, by doing Z\" — strong action verb first, clear ownership, "
        "a measurable metric, and the mechanism/system used. Tailor language and keywords to the target role. "
        "NEVER invent numbers. If the candidate's original bullet has no metric, insert a clearly-marked placeholder "
        "token the candidate must verify, e.g. \"[X% increase]\", \"[N hours saved]\", \"[$Y ARR]\", \"[N-person team]\". "
        "Return ONLY valid JSON."
    )

    user = f"""Target role style: {role_label} (emphasis: {role_guide})
Job title: {job.get('title')}
Required skills: {', '.join(job.get('required_skills') or [])}
Nice-to-have: {', '.join(job.get('nice_to_have_skills') or [])}
Candidate skills: {', '.join(candidate_skills)}
Candidate current JD match %: {current_fit}

Candidate's existing experience bullets (rewrite the weakest 3-5; use the EXACT original text as "before"):
{numbered}

CV excerpt (context only):
{cv_text[:3500]}

Return this exact JSON shape:
{{
  "missing_keywords": [string],
  "skills_to_add": [string],
  "suggested_summary": string,
  "bullet_rewrites": [
    {{
      "before": string,
      "issue": string,
      "after": string,
      "keywords_added": [string],
      "score_impact": {{ "jd_match": int, "ats": int, "recruiter_scan": int }}
    }}
  ],
  "recruiter_readability_score": int,
  "risk_notes": [string]
}}

Rules:
- "suggested_summary": 2-3 sentences, senior and specific, tuned to {role_label}; use [placeholder] tokens for any metric.
- Every "after" leads with a strong action verb (Drove, Shipped, Led, Architected, Scaled, Launched) and includes 1-2 JD keywords.
- Include a seniority signal (scope, team size, ownership) where the original implies it.
- Do NOT fabricate metrics; mark every unverified number as a [placeholder] token.
- score_impact values are additive POINTS, each between 0 and 15."""

    try:
        response = chat_completion(
            feature="analyze_gap",
            candidate_id=candidate.get("id"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2000,
        )
        result = json.loads(response.choices[0].message.content or "{}")
        finalized = _finalize_gap(result, current_fit, role_style)
        if not finalized["bullet_rewrites"]:
            return _fallback_gap_analysis(job, candidate_skills, current_fit, role_style, cv_bullets, cv_text)
        return finalized
    except BudgetExceeded:
        raise
    except Exception:
        return _fallback_gap_analysis(job, candidate_skills, current_fit, role_style, cv_bullets, cv_text)


def _structured_fallback_bullet(before: str, keyword: str, index: int) -> dict[str, Any]:
    verb = STRONG_VERBS[index % len(STRONG_VERBS)]
    after = (
        f"{verb} [X% improvement] in [key metric] by leading {keyword} initiatives "
        f"across a [N-person] cross-functional team, delivering [measurable business outcome]."
    )
    return {
        "id": f"br-{index}",
        "before": before or f"Worked on {keyword}.",
        "issue": "Too vague — no quantified impact, weak action verb, and missing role-relevant keywords.",
        "after": after,
        "keywords_added": [keyword],
        "score_impact": {"jd_match": 6, "ats": 4, "recruiter_scan": 5},
        "is_placeholder": True,
    }


def _fallback_gap_analysis(
    job: dict[str, Any], candidate_skills: list[str], current_fit: float,
    role_style: str = "ai_product_manager", cv_bullets: list[str] | None = None,
    cv_text: str = "",
) -> dict[str, Any]:
    # Source-only analysis remains available without inventing rewrite content,
    # quality scores or an unexecuted post-rewrite score increase.
    required = normalize_skills(job.get("required_skills") or [])
    recorded = {s.lower() for s in normalize_skills(candidate_skills + extract_skills_from_text(cv_text))}
    return {
        "missing_keywords": [skill for skill in required if skill.lower() not in recorded][:10],
        "skills_to_add": [], "suggested_summary": "", "suggested_bullets": [],
        "weak_bullets": [bullet for bullet in (cv_bullets or []) if bullet.strip()],
        "bullet_rewrites": [], "current_fit": round(float(current_fit), 1),
        "projected_fit": None, "ats_match_score": None, "recruiter_readability_score": None,
        "risk_notes": ["Rewrite generation is unavailable for this analysis. No projected score has been measured."],
        "role_style": role_style, "truthfulness_warning": "", "generation_mode": "unavailable",
    }


async def rewrite_single_bullet(
    bullet: str,
    job: dict[str, Any],
    role_style: str = "ai_product_manager",
    mode: str = "regenerate",
) -> dict[str, Any]:
    if mode not in ACTION_MODES:
        mode = "regenerate"

    if not settings.openai_api_key:
        return _fallback_single_bullet(bullet, job, role_style, mode)

    role_label = _role_label(role_style)
    role_guide = _role_guide(role_style)
    mode_instructions = {
        "regenerate": "Produce a DIFFERENT strong X-Y-Z rewrite than the input; vary the action verb and framing.",
        "senior": "Increase the seniority signal: emphasize scope, ownership, cross-functional leadership, and strategic impact (use larger numbers as [placeholders]).",
        "concise": "Tighten to one punchy line under 200 characters; keep one metric and one JD keyword; cut all filler.",
    }[mode]

    system = (
        "You are a senior FAANG resume coach. Rewrite a single CV bullet into the X-Y-Z format with a strong "
        "action verb, ownership, a measurable metric, and the mechanism. NEVER invent numbers — use [placeholder] "
        "tokens like [X% increase] or [N hours saved] when no real metric exists. Return ONLY valid JSON."
    )
    user = f"""Target role style: {role_label} (emphasis: {role_guide})
Job title: {job.get('title') or ''}
Required skills: {', '.join(job.get('required_skills') or [])}
Mode: {mode} — {mode_instructions}

Bullet to rewrite:
{bullet[:600]}

Return this exact JSON:
{{
  "after": string,
  "issue": string,
  "keywords_added": [string],
  "score_impact": {{ "jd_match": int, "ats": int, "recruiter_scan": int }}
}}
score_impact values are additive POINTS, each between 0 and 15."""

    try:
        response = chat_completion(
            feature="rewrite_bullet",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=600,
        )
        raw = json.loads(response.choices[0].message.content or "{}")
        after = str(raw.get("after") or "").strip()
        if not after:
            return _fallback_single_bullet(bullet, job, role_style, mode)
        return {
            "after": after,
            "issue": str(raw.get("issue") or "").strip(),
            "keywords_added": [str(k).strip() for k in (raw.get("keywords_added") or []) if str(k).strip()][:8],
            "score_impact": _normalize_score_impact(raw.get("score_impact")),
            "is_placeholder": bool(PLACEHOLDER_RE.search(after)),
        }
    except BudgetExceeded:
        raise
    except Exception:
        return _fallback_single_bullet(bullet, job, role_style, mode)


def _fallback_single_bullet(
    bullet: str,
    job: dict[str, Any],
    role_style: str,
    mode: str,
) -> dict[str, Any]:
    req = normalize_skills(job.get("required_skills") or [])
    keyword = req[0] if req else "cross-functional delivery"
    if mode == "concise":
        after = f"Drove [X% improvement] in [key metric] through {keyword}."
    elif mode == "senior":
        after = (
            f"Owned the strategy and delivery of {keyword} across [N] teams, "
            f"driving [X% improvement] in [business metric] and [$Y] in measurable impact."
        )
    else:
        verb = STRONG_VERBS[(len(bullet)) % len(STRONG_VERBS)]
        after = (
            f"{verb} [X% improvement] in [key metric] by leading {keyword} initiatives "
            f"across a [N-person] cross-functional team."
        )
    return {
        "after": after,
        "issue": "Too vague — no quantified impact or role-relevant keywords.",
        "keywords_added": [keyword],
        "score_impact": {"jd_match": 6, "ats": 4, "recruiter_scan": 5},
        "is_placeholder": True,
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
