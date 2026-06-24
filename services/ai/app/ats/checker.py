"""Deterministic ATS (Applicant Tracking System) compliance checker.

Ported from the talent-signal-labs reference. The core is fully deterministic
(regex + heuristics); an optional single LLM pass enriches keyword suggestions.
"""
import json
import re
from typing import Any

from app.budget import BudgetExceeded
from app.config import settings
from app.openai_client import chat_completion

SECTION_PATTERNS = {
    "Experience": re.compile(r"\b(work\s+experience|professional\s+experience|experience|employment)\b", re.I),
    "Education": re.compile(r"\b(education|academic)\b", re.I),
    "Skills": re.compile(r"\b(skills|technical\s+skills|competencies)\b", re.I),
    "Summary": re.compile(r"\b(summary|profile|objective|about)\b", re.I),
    "Projects": re.compile(r"\bprojects?\b", re.I),
    "Certifications": re.compile(r"\b(certifications?|licenses?)\b", re.I),
}

ACTION_VERBS = {
    "led", "built", "launched", "designed", "developed", "implemented", "increased", "reduced", "drove", "owned",
    "shipped", "created", "managed", "architected", "optimized", "delivered", "grew", "scaled", "automated", "migrated",
    "spearheaded", "negotiated", "streamlined", "orchestrated", "mentored", "established", "executed", "analyzed",
    "accelerated", "generated",
}

_BULLET_RE = re.compile(r"^\s*([•\-\*•]|\d+[\.\)])\s+")
_QUANT_RE = re.compile(
    r"\d+(%|x|\+| (users|customers|people|hours|days|weeks|months|years|million|thousand|k\b|m\b|b\b))",
    re.I,
)


def _check(cid, category, label, status, detail, fix=""):
    return {"id": cid, "category": category, "label": label, "status": status, "detail": detail, "fix": fix}


def deterministic_checks(cv_text: str) -> dict[str, Any]:
    text = cv_text.strip()
    lower = text.lower()
    words = [w for w in re.split(r"\s+", text) if w]
    word_count = len(words)

    bullet_lines = [l for l in re.split(r"\n+", text) if _BULLET_RE.match(l)]
    bullet_count = len(bullet_lines)

    sections_found, sections_missing = [], []
    for name, rx in SECTION_PATTERNS.items():
        (sections_found if rx.search(text) else sections_missing).append(name)

    verb_hits = quantified = 0
    for b in bullet_lines:
        stripped = _BULLET_RE.sub("", b)
        first = re.sub(r"[^a-z]", "", (stripped.split() or [""])[0].lower())
        if first in ACTION_VERBS:
            verb_hits += 1
        if _QUANT_RE.search(stripped) or re.search(r"\$\s?\d", stripped) or re.search(r"\d+%", stripped):
            quantified += 1
    action_ratio = verb_hits / bullet_count if bullet_count else 0.0

    has_email = bool(re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text))
    has_phone = bool(re.search(r"(\+?\d[\d\s().-]{7,})", text))
    has_linkedin = bool(re.search(r"linkedin\.com/in/", text, re.I))
    has_tables = bool(re.search(r"\|.+\|", text) or re.search(r"\t.*\t", text))
    has_non_ascii = bool(re.search(r"[^\x00-\x7F]", text))
    long_lines = len([l for l in text.split("\n") if len(l) > 200])
    has_first_person = bool(re.search(r"\b(i|me|my)\b", lower))

    checks = []
    for s in ("Experience", "Education", "Skills"):
        ok = s in sections_found
        checks.append(_check(f"section-{s.lower()}", "structure", f"Section: {s}",
                             "pass" if ok else "fail",
                             f"{s} section detected." if ok else f'No "{s}" heading found.',
                             "" if ok else f'Add an "{s}" heading on its own line so the parser can segment your CV.'))
    for s in ("Summary", "Projects", "Certifications"):
        if s not in sections_found:
            checks.append(_check(f"section-{s.lower()}", "structure", f"Optional section: {s}", "warn",
                                 f"No {s} section found.",
                                 f"Consider adding a {s} section to surface more signal to recruiters and ATS."))

    checks.append(_check("contact-email", "contact", "Email address", "pass" if has_email else "fail",
                         "Email detected." if has_email else "No email address detected.",
                         "" if has_email else "Add a professional email near the top of your CV."))
    checks.append(_check("contact-phone", "contact", "Phone number", "pass" if has_phone else "warn",
                         "Phone detected." if has_phone else "No phone number detected.",
                         "" if has_phone else "Add a contact phone number with country code."))
    checks.append(_check("contact-linkedin", "contact", "LinkedIn URL", "pass" if has_linkedin else "warn",
                         "LinkedIn profile detected." if has_linkedin else "No LinkedIn URL detected.",
                         "" if has_linkedin else "Add your linkedin.com/in/<handle> URL in the header."))

    checks.append(_check("format-tables", "formatting", "Tables / multi-column layout",
                         "fail" if has_tables else "pass",
                         "Detected table-like rows or tab columns." if has_tables else "No table/column artifacts detected.",
                         "Most ATS parsers mangle tables and columns. Use a single column of plain text." if has_tables else ""))
    checks.append(_check("format-nonascii", "formatting", "Special characters",
                         "warn" if has_non_ascii else "pass",
                         "Non-ASCII characters detected (icons/symbols may not parse)." if has_non_ascii else "Clean ASCII text.",
                         "Replace decorative icons/symbols with plain text labels (Email:, Phone:)." if has_non_ascii else ""))
    length_status = "fail" if word_count < 250 else ("warn" if word_count > 1200 else "pass")
    length_fix = ("Your CV looks too short. Aim for 400-800 words." if word_count < 250
                  else "CV is long. Trim to 1-2 pages (~600-1000 words)." if word_count > 1200 else "")
    checks.append(_check("format-length", "formatting", "Length", length_status, f"{word_count} words detected.", length_fix))
    checks.append(_check("format-longlines", "formatting", "Line length", "warn" if long_lines > 3 else "pass",
                         f"{long_lines} very long lines detected." if long_lines > 3 else "Line lengths look healthy.",
                         "Break long paragraphs into short, scannable bullets." if long_lines > 3 else ""))

    bullets_status = "fail" if bullet_count < 5 else ("warn" if bullet_count < 10 else "pass")
    checks.append(_check("content-bullets", "content", "Bulleted achievements", bullets_status,
                         f"{bullet_count} bullet lines detected.",
                         "Convert prose into 4-6 bullets per role, each starting with a strong action verb." if bullet_count < 5 else ""))
    verbs_status = "pass" if action_ratio >= 0.6 else ("warn" if action_ratio >= 0.3 else "fail")
    checks.append(_check("content-verbs", "content", "Action verbs", verbs_status,
                         f"{round(action_ratio * 100)}% of bullets start with a strong action verb.",
                         "Start every bullet with a verb like Led, Built, Launched, Reduced, Drove, Shipped." if action_ratio < 0.6 else ""))
    quant_target = max(3, bullet_count * 0.4)
    quant_status = "pass" if quantified >= quant_target else ("warn" if quantified > 0 else "fail")
    checks.append(_check("content-quantified", "content", "Quantified impact", quant_status,
                         f"{quantified} bullets include numbers, %, or $ impact.",
                         "Add metrics wherever you can: %, $, users, scope, time saved, revenue moved." if quantified < quant_target else ""))
    checks.append(_check("content-firstperson", "content", "First-person pronouns", "warn" if has_first_person else "pass",
                         "Found first-person pronouns (I/me/my)." if has_first_person else "No first-person pronouns.",
                         "Drop I/me/my — start bullets with the verb instead." if has_first_person else ""))

    return {
        "checks": checks,
        "stats": {
            "wordCount": word_count, "bulletCount": bullet_count,
            "sectionsFound": sections_found, "sectionsMissing": sections_missing,
            "actionVerbsRatio": round(action_ratio, 2), "quantifiedBullets": quantified,
        },
    }


def _score(checks: list[dict[str, Any]]) -> int:
    if not checks:
        return 0
    weight = {"pass": 1.0, "warn": 0.5, "fail": 0.0}
    total = sum(weight[c["status"]] for c in checks)
    return round(100 * total / len(checks))


async def _keyword_suggestions(cv_text: str, jd_text: str | None, target_role: str | None) -> list[str]:
    if not settings.openai_api_key:
        return []
    try:
        ctx = ""
        if target_role:
            ctx += f"Target role: {target_role}\n"
        if jd_text:
            ctx += f"Job description:\n{jd_text[:3000]}\n"
        resp = chat_completion(
            feature="ats_check",
            messages=[
                {"role": "system", "content": "You are an ATS keyword specialist. Return STRICT JSON only."},
                {"role": "user", "content": (
                    f"{ctx}\nCV excerpt:\n{cv_text[:3000]}\n\n"
                    'Return up to 10 role-relevant ATS keywords the CV is MISSING. '
                    'JSON: {"keyword_suggestions": [string]}'
                )},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=300,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        return [str(k).strip() for k in (data.get("keyword_suggestions") or []) if str(k).strip()][:10]
    except BudgetExceeded:
        raise
    except Exception:
        return []


async def run_ats_check(cv_text: str, jd_text: str | None = None, target_role: str | None = None) -> dict[str, Any]:
    det = deterministic_checks(cv_text)
    score = _score(det["checks"])
    keyword_suggestions = await _keyword_suggestions(cv_text, jd_text, target_role)

    top_fixes = [c["fix"] for c in det["checks"] if c["status"] in ("fail", "warn") and c["fix"]][:5]
    summary = (
        f"ATS score {score}/100. "
        + ("Strong parser compatibility." if score >= 80 else
           "Some parsing/keyword gaps to fix." if score >= 55 else
           "Significant ATS issues — address the top fixes below.")
    )

    return {
        "score": score,
        "summary": summary,
        "stats": det["stats"],
        "checks": det["checks"],
        "keyword_suggestions": keyword_suggestions,
        "top_fixes": top_fixes,
    }
