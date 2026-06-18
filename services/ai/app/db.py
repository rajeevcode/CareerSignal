import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import settings


def get_db_path() -> str:
    return settings.database_path


@contextmanager
def get_conn():
    path = get_db_path()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _parse_json(value: str | None, default: Any = None) -> Any:
    if not value:
        return default if default is not None else []
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default if default is not None else []


def _row_to_candidate(row: sqlite3.Row, skills: list[str]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "current_title": row["current_title"],
        "location": row["location"],
        "total_experience_years": row["total_experience_years"],
        "remote_preference": row["remote_preference"],
        "target_roles": _parse_json(row["target_roles"], []),
        "profile_summary": row["profile_summary"],
        "visa_status": row["visa_status"],
        "cv_score": row["cv_score"],
        "embedding": _parse_json(row["embedding"], None),
    }


def _row_to_job(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "company_id": row["company_id"],
        "title": row["title"],
        "description": row["description"],
        "location": row["location"],
        "remote_type": row["remote_type"],
        "experience_min": row["experience_min"],
        "experience_max": row["experience_max"],
        "required_skills": _parse_json(row["required_skills"], []),
        "nice_to_have_skills": _parse_json(row["nice_to_have_skills"], []),
        "visa_sponsorship": bool(row["visa_sponsorship"]),
        "function_tag": row["function_tag"],
        "tech_stack": _parse_json(row["tech_stack"], []),
        "applicant_count": row["applicant_count"] or 0,
        "posted_at": row["posted_at"],
        "embedding": _parse_json(row["embedding"], None),
    }


def get_candidate(candidate_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM candidate_profiles WHERE id = ?", (candidate_id,)
        ).fetchone()
        if not row:
            return None
        skills = [
            r["skill_name"]
            for r in conn.execute(
                "SELECT skill_name FROM candidate_skills WHERE candidate_id = ?",
                (candidate_id,),
            ).fetchall()
        ]
        return _row_to_candidate(row, skills)


def get_job(job_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return _row_to_job(row) if row else None


def list_published_jobs(limit: int = 50) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM jobs WHERE status = 'published' LIMIT ?", (limit,)
        ).fetchall()
        return [_row_to_job(r) for r in rows]


def get_candidate_skills(candidate_id: str) -> list[str]:
    with get_conn() as conn:
        return [
            r["skill_name"]
            for r in conn.execute(
                "SELECT skill_name FROM candidate_skills WHERE candidate_id = ?",
                (candidate_id,),
            ).fetchall()
        ]


def get_primary_cv_text(candidate_id: str) -> str:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT parsed_text FROM cv_uploads WHERE candidate_id = ? AND is_primary = 1 LIMIT 1",
            (candidate_id,),
        ).fetchone()
        return row["parsed_text"] if row and row["parsed_text"] else ""


def get_primary_cv_parsed(candidate_id: str) -> dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT parsed_json FROM cv_uploads WHERE candidate_id = ? AND is_primary = 1 LIMIT 1",
            (candidate_id,),
        ).fetchone()
        return _parse_json(row["parsed_json"] if row else None, {}) or {}


def get_match_final_score(candidate_id: str, job_id: str) -> float | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT final_score FROM match_scores WHERE candidate_id = ? AND job_id = ?",
            (candidate_id, job_id),
        ).fetchone()
        return float(row["final_score"]) if row else None


def get_match_explanation(candidate_id: str, job_id: str) -> dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT explanation_json FROM match_scores WHERE candidate_id = ? AND job_id = ?",
            (candidate_id, job_id),
        ).fetchone()
        return _parse_json(row["explanation_json"] if row else None, {}) or {}


def save_parsed_cv(
    candidate_id: str,
    file_name: str,
    parsed: dict[str, Any],
    parsed_text: str,
    ats_score: float,
    skills: list[str],
    embedding: list[float],
) -> str:
    from app.scoring.cv_score_engine import compute_cv_score_breakdown

    candidate = get_candidate(candidate_id) or {}
    target_roles = candidate.get("target_roles") or []
    cv_result = compute_cv_score_breakdown(parsed_text, parsed, skills, target_roles)
    overall_score = cv_result["overall_score"]

    now = datetime.now(timezone.utc).isoformat()
    cv_id = str(uuid.uuid4())

    with get_conn() as conn:
        conn.execute(
            "UPDATE cv_uploads SET is_primary = 0 WHERE candidate_id = ?",
            (candidate_id,),
        )
        conn.execute(
            """INSERT INTO cv_uploads
            (id, candidate_id, file_path, file_name, parsed_json, parsed_text, ats_score, is_primary, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)""",
            (
                cv_id,
                candidate_id,
                f"uploads/{candidate_id}/{file_name}",
                file_name,
                json.dumps(parsed),
                parsed_text,
                ats_score,
                now,
            ),
        )
        conn.execute(
            """UPDATE candidate_profiles SET
            current_title = ?, location = ?, total_experience_years = ?,
            profile_summary = ?, cv_score = ?, cv_score_breakdown = ?, cv_feedback_json = ?,
            embedding = ?, updated_at = ?
            WHERE id = ?""",
            (
                parsed.get("current_title"),
                parsed.get("location"),
                parsed.get("total_experience_years"),
                parsed.get("profile_summary"),
                overall_score,
                json.dumps(cv_result["breakdown"]),
                json.dumps(cv_result["feedback"]),
                json.dumps(embedding),
                now,
                candidate_id,
            ),
        )
        conn.execute(
            "DELETE FROM candidate_experience WHERE candidate_id = ?",
            (candidate_id,),
        )
        for i, exp in enumerate(parsed.get("experience") or []):
            conn.execute(
                """INSERT INTO candidate_experience
                (id, candidate_id, company, title, start_date, end_date, location, description,
                 achievements, skills_used, sort_order, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(uuid.uuid4()),
                    candidate_id,
                    exp.get("company", "Unknown"),
                    exp.get("title", "Unknown"),
                    exp.get("start_date"),
                    exp.get("end_date"),
                    exp.get("location"),
                    exp.get("description"),
                    json.dumps(exp.get("achievements") or []),
                    json.dumps(exp.get("skills_used") or []),
                    i,
                    now,
                ),
            )
        conn.execute(
            "DELETE FROM candidate_skills WHERE candidate_id = ?",
            (candidate_id,),
        )
        for skill in skills:
            conn.execute(
                """INSERT INTO candidate_skills
                (id, candidate_id, skill_name, source, created_at)
                VALUES (?, ?, ?, 'cv', ?)""",
                (str(uuid.uuid4()), candidate_id, skill, now),
            )

    return cv_id


def update_job_parsing(
    job_id: str,
    required_skills: list[str],
    nice_to_have_skills: list[str],
    embedding: list[float],
) -> None:
    with get_conn() as conn:
        conn.execute(
            """UPDATE jobs SET required_skills = ?, nice_to_have_skills = ?, embedding = ?, updated_at = ?
            WHERE id = ?""",
            (
                json.dumps(required_skills),
                json.dumps(nice_to_have_skills),
                json.dumps(embedding),
                datetime.now(timezone.utc).isoformat(),
                job_id,
            ),
        )


def upsert_match_score(
    candidate_id: str,
    job_id: str,
    breakdown: dict[str, float],
    explanation: dict[str, Any],
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM match_scores WHERE candidate_id = ? AND job_id = ?",
            (candidate_id, job_id),
        ).fetchone()
        values = (
            breakdown["skill_score"],
            breakdown["experience_score"],
            breakdown["role_similarity_score"],
            breakdown["domain_score"],
            breakdown.get("seniority_score", 50),
            breakdown["location_score"],
            breakdown["cv_score"],
            breakdown["competition_score"],
            breakdown["freshness_score"],
            breakdown["final_score"],
            breakdown.get("jd_match_score", breakdown["final_score"]),
            breakdown.get("interview_signal", breakdown["final_score"]),
            json.dumps(explanation),
            now,
        )
        if existing:
            conn.execute(
                """UPDATE match_scores SET
                skill_score = ?, experience_score = ?, role_similarity_score = ?,
                domain_score = ?, seniority_score = ?, location_score = ?, cv_score = ?,
                competition_score = ?, freshness_score = ?, final_score = ?,
                jd_match_score = ?, interview_signal = ?,
                explanation_json = ?, computed_at = ?
                WHERE candidate_id = ? AND job_id = ?""",
                (*values, candidate_id, job_id),
            )
        else:
            conn.execute(
                """INSERT INTO match_scores
                (id, candidate_id, job_id, skill_score, experience_score, role_similarity_score,
                 domain_score, seniority_score, location_score, cv_score, competition_score, freshness_score,
                 final_score, jd_match_score, interview_signal, explanation_json, computed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), candidate_id, job_id, *values),
            )


def update_match_explanation(candidate_id: str, job_id: str, explanation: dict[str, Any]) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """UPDATE match_scores SET explanation_json = ?, computed_at = ?
            WHERE candidate_id = ? AND job_id = ?""",
            (json.dumps(explanation), now, candidate_id, job_id),
        )


def update_candidate_embedding(candidate_id: str, embedding: list[float]) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE candidate_profiles SET embedding = ?, updated_at = ? WHERE id = ?",
            (
                json.dumps(embedding),
                datetime.now(timezone.utc).isoformat(),
                candidate_id,
            ),
        )


def update_candidate_cv_score(candidate_id: str, overall: float, breakdown: dict, feedback: dict) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """UPDATE candidate_profiles SET cv_score = ?, cv_score_breakdown = ?,
            cv_feedback_json = ?, updated_at = ? WHERE id = ?""",
            (overall, json.dumps(breakdown), json.dumps(feedback), now, candidate_id),
        )


def save_jd_analysis(
    candidate_id: str,
    jd_text: str,
    job_title: str | None,
    breakdown: dict[str, float],
    gap: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc).isoformat()
    analysis_id = str(uuid.uuid4())
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO jd_analyses
            (id, candidate_id, jd_text, job_title, jd_match_score, interview_signal, breakdown_json, gap_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                analysis_id,
                candidate_id,
                jd_text,
                job_title,
                breakdown.get("jd_match_score"),
                breakdown.get("interview_signal"),
                json.dumps(breakdown),
                json.dumps(gap) if gap else None,
                now,
            ),
        )
    return analysis_id
