import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from app.config import settings

# Trusted backend pool (postgres superuser) — RLS-exempt by design. A single
# pooled set of connections is reused across requests instead of opening a fresh
# TCP+TLS connection per call. Opened lazily so import never blocks on the DB.
_pool: ConnectionPool | None = None


def _get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            settings.supabase_db_url,
            min_size=1,
            max_size=10,
            kwargs={"row_factory": dict_row},
            open=True,
        )
    return _pool


@contextmanager
def get_conn():
    # pool.connection() commits on clean exit and rolls back on exception,
    # then returns the connection to the pool (does not close it).
    with _get_pool().connection() as conn:
        yield conn


def _parse_json(value: Any, default: Any = None) -> Any:
    """jsonb columns come back already decoded; guard for str/None too."""
    if value is None:
        return default if default is not None else []
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        import json

        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default if default is not None else []
    return default if default is not None else []


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_candidate(row: dict[str, Any], skills: list[str]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]),
        "current_title": row["current_title"],
        "location": row["location"],
        "total_experience_years": row["total_experience_years"],
        "remote_preference": row["remote_preference"],
        "target_roles": row.get("target_roles") or [],
        "profile_summary": row["profile_summary"],
        "visa_status": row["visa_status"],
        "cv_score": row["cv_score"],
        "embedding": None,
    }


def _row_to_job(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "company_id": str(row["company_id"]) if row["company_id"] else None,
        "title": row["title"],
        "description": row["description"],
        "location": row["location"],
        "remote_type": row["remote_type"],
        "experience_min": row["experience_min"],
        "experience_max": row["experience_max"],
        "required_skills": row.get("required_skills") or [],
        "nice_to_have_skills": row.get("nice_to_have_skills") or [],
        "visa_sponsorship": bool(row["visa_sponsorship"]),
        "function_tag": row["function_tag"],
        "tech_stack": row.get("tech_stack") or [],
        "applicant_count": row["applicant_count"] or 0,
        "posted_at": row["posted_at"].isoformat() if hasattr(row["posted_at"], "isoformat") else row["posted_at"],
        "embedding": None,
    }


def get_candidate(candidate_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM candidate_profiles WHERE id = %s", (candidate_id,)
        ).fetchone()
        if not row:
            return None
        skills = [
            r["skill_name"]
            for r in conn.execute(
                "SELECT skill_name FROM candidate_skills WHERE candidate_id = %s",
                (candidate_id,),
            ).fetchall()
        ]
        return _row_to_candidate(row, skills)


def get_job(job_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = %s", (job_id,)).fetchone()
        return _row_to_job(row) if row else None


def list_published_jobs(limit: int = 50) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM jobs WHERE status = 'published' LIMIT %s", (limit,)
        ).fetchall()
        return [_row_to_job(r) for r in rows]


def get_candidate_skills(candidate_id: str) -> list[str]:
    with get_conn() as conn:
        return [
            r["skill_name"]
            for r in conn.execute(
                "SELECT skill_name FROM candidate_skills WHERE candidate_id = %s",
                (candidate_id,),
            ).fetchall()
        ]


def get_primary_cv_text(candidate_id: str) -> str:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT parsed_text FROM cv_uploads WHERE candidate_id = %s AND is_primary = true LIMIT 1",
            (candidate_id,),
        ).fetchone()
        return row["parsed_text"] if row and row["parsed_text"] else ""


def get_primary_cv_parsed(candidate_id: str) -> dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT parsed_json FROM cv_uploads WHERE candidate_id = %s AND is_primary = true LIMIT 1",
            (candidate_id,),
        ).fetchone()
        return _parse_json(row["parsed_json"] if row else None, {}) or {}


def get_match_final_score(candidate_id: str, job_id: str) -> float | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT final_score FROM match_scores WHERE candidate_id = %s AND job_id = %s",
            (candidate_id, job_id),
        ).fetchone()
        return float(row["final_score"]) if row else None


def get_match_explanation(candidate_id: str, job_id: str) -> dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT explanation_json FROM match_scores WHERE candidate_id = %s AND job_id = %s",
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
    file_path: str | None = None,
) -> str:
    from app.scoring.cv_score_engine import compute_cv_score_breakdown

    candidate = get_candidate(candidate_id) or {}
    target_roles = candidate.get("target_roles") or []
    cv_result = compute_cv_score_breakdown(parsed_text, parsed, skills, target_roles)
    overall_score = cv_result["overall_score"]

    now = _now()
    cv_id = str(uuid.uuid4())
    stored_path = file_path or f"{candidate_id}/{file_name}"

    with get_conn() as conn:
        conn.execute(
            "UPDATE cv_uploads SET is_primary = false WHERE candidate_id = %s",
            (candidate_id,),
        )
        conn.execute(
            """INSERT INTO cv_uploads
            (id, candidate_id, file_path, file_name, parsed_json, parsed_text, ats_score, is_primary, uploaded_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, true, %s)""",
            (
                cv_id,
                candidate_id,
                stored_path,
                file_name,
                Jsonb(parsed),
                parsed_text,
                ats_score,
                now,
            ),
        )
        conn.execute(
            """UPDATE candidate_profiles SET
            current_title = %s, location = %s, total_experience_years = %s,
            profile_summary = %s, cv_score = %s, cv_score_breakdown = %s, cv_feedback_json = %s,
            updated_at = %s
            WHERE id = %s""",
            (
                parsed.get("current_title"),
                parsed.get("location"),
                parsed.get("total_experience_years"),
                parsed.get("profile_summary"),
                overall_score,
                Jsonb(cv_result["breakdown"]),
                Jsonb(cv_result["feedback"]),
                now,
                candidate_id,
            ),
        )
        conn.execute(
            "DELETE FROM candidate_experience WHERE candidate_id = %s",
            (candidate_id,),
        )
        for i, exp in enumerate(parsed.get("experience") or []):
            conn.execute(
                """INSERT INTO candidate_experience
                (id, candidate_id, company, title, start_date, end_date, location, description,
                 achievements, skills_used, sort_order, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    str(uuid.uuid4()),
                    candidate_id,
                    exp.get("company", "Unknown"),
                    exp.get("title", "Unknown"),
                    exp.get("start_date"),
                    exp.get("end_date"),
                    exp.get("location"),
                    exp.get("description"),
                    exp.get("achievements") or [],
                    exp.get("skills_used") or [],
                    i,
                    now,
                ),
            )
        conn.execute(
            "DELETE FROM candidate_skills WHERE candidate_id = %s",
            (candidate_id,),
        )
        for skill in skills:
            conn.execute(
                """INSERT INTO candidate_skills
                (id, candidate_id, skill_name, source, created_at)
                VALUES (%s, %s, %s, 'cv', %s)""",
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
            """UPDATE jobs SET required_skills = %s, nice_to_have_skills = %s, updated_at = %s
            WHERE id = %s""",
            (required_skills, nice_to_have_skills, _now(), job_id),
        )


def upsert_match_score(
    candidate_id: str,
    job_id: str,
    breakdown: dict[str, float],
    explanation: dict[str, Any],
) -> None:
    now = _now()
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM match_scores WHERE candidate_id = %s AND job_id = %s",
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
            Jsonb(explanation),
            now,
        )
        if existing:
            conn.execute(
                """UPDATE match_scores SET
                skill_score = %s, experience_score = %s, role_similarity_score = %s,
                domain_score = %s, seniority_score = %s, location_score = %s, cv_score = %s,
                competition_score = %s, freshness_score = %s, final_score = %s,
                jd_match_score = %s, interview_signal = %s,
                explanation_json = %s, computed_at = %s
                WHERE candidate_id = %s AND job_id = %s""",
                (*values, candidate_id, job_id),
            )
        else:
            conn.execute(
                """INSERT INTO match_scores
                (id, candidate_id, job_id, skill_score, experience_score, role_similarity_score,
                 domain_score, seniority_score, location_score, cv_score, competition_score, freshness_score,
                 final_score, jd_match_score, interview_signal, explanation_json, computed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (str(uuid.uuid4()), candidate_id, job_id, *values),
            )


def update_match_explanation(candidate_id: str, job_id: str, explanation: dict[str, Any]) -> None:
    with get_conn() as conn:
        conn.execute(
            """UPDATE match_scores SET explanation_json = %s, computed_at = %s
            WHERE candidate_id = %s AND job_id = %s""",
            (Jsonb(explanation), _now(), candidate_id, job_id),
        )


def update_candidate_embedding(candidate_id: str, embedding: list[float]) -> None:
    # Embedding (pgvector) is managed by the matching pipeline directly; no-op here
    # to keep the public signature stable.
    with get_conn() as conn:
        conn.execute(
            "UPDATE candidate_profiles SET updated_at = %s WHERE id = %s",
            (_now(), candidate_id),
        )


def update_candidate_cv_score(candidate_id: str, overall: float, breakdown: dict, feedback: dict) -> None:
    with get_conn() as conn:
        conn.execute(
            """UPDATE candidate_profiles SET cv_score = %s, cv_score_breakdown = %s,
            cv_feedback_json = %s, updated_at = %s WHERE id = %s""",
            (overall, Jsonb(breakdown), Jsonb(feedback), _now(), candidate_id),
        )


def list_coach_messages(candidate_id: str, limit: int = 20) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT role, content FROM coach_messages
            WHERE candidate_id = %s ORDER BY created_at ASC LIMIT %s""",
            (candidate_id, limit),
        ).fetchall()
        return [{"role": r["role"], "content": r["content"]} for r in rows]


def get_company_for_job(job_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT c.* FROM companies c
            INNER JOIN jobs j ON j.company_id = c.id
            WHERE j.id = %s""",
            (job_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "id": str(row["id"]),
            "name": row["name"],
            "industry": row["industry"],
            "description": row["description"],
            "website": row["website"],
        }


def save_jd_analysis(
    candidate_id: str,
    jd_text: str,
    job_title: str | None,
    breakdown: dict[str, float],
    gap: dict[str, Any] | None = None,
) -> str:
    now = _now()
    analysis_id = str(uuid.uuid4())
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO jd_analyses
            (id, candidate_id, jd_text, job_title, jd_match_score, interview_signal, breakdown_json, gap_json, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                analysis_id,
                candidate_id,
                jd_text,
                job_title,
                breakdown.get("jd_match_score"),
                breakdown.get("interview_signal"),
                Jsonb(breakdown),
                Jsonb(gap) if gap else None,
                now,
            ),
        )
    return analysis_id
