"""Deterministic source excerpts. Mentions support review, not qualification verification."""
import re
import hashlib
from typing import Any

SCORING_VERSION = "heuristic-fit-v2"


def _excerpt(text: str, phrase: str) -> str | None:
    pattern = re.compile(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", re.IGNORECASE)
    for line in re.split(r"[\n\r]+|(?<=[.!?])\s+", text):
        match = pattern.search(line)
        if match:
            # Keep the match inside the excerpt even when a PDF produces a very long line.
            start = max(0, match.start() - 100)
            return line[start:start + max(300, len(phrase) + 100)].strip()
    return None


def build_evidence_report(job: dict[str, Any], cv_text: str) -> dict[str, Any]:
    jd_text = str(job.get("description") or "")
    rows = []
    seen = set()
    for skill in job.get("required_skills") or []:
        if not isinstance(skill, str) or not skill.strip() or skill.lower() in seen:
            continue
        seen.add(skill.lower())
        jd_excerpt = _excerpt(jd_text, skill)
        cv_excerpt = _excerpt(cv_text, skill)
        # Never claim an inferred or model-generated skill was quoted in the source JD.
        if not jd_excerpt:
            continue
        rows.append({
            "skill": skill, "jd_excerpt": jd_excerpt, "cv_excerpt": cv_excerpt,
            "status": "mentioned" if cv_excerpt else "not_found" if cv_text.strip() else "unknown",
        })
    return {
        "scoring_version": SCORING_VERSION,
        "cv_fingerprint": hashlib.sha256(cv_text.encode()).hexdigest() if cv_text.strip() else None,
        "job_fingerprint": hashlib.sha256((str(job.get("title") or "") + "\n" + jd_text.strip()).encode()).hexdigest(),
        "method": "Case-insensitive phrase mentions in source text; not proof of proficiency or employer requirements.",
        "skills": rows,
        "unknown_context": ["External applicant pool", "Recruiter activity", "Interview outcome probability"],
        "cv_text_available": bool(cv_text.strip()),
    }
