from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.analyzer.cv_job_analyzer import (
    analyze_cv_job_gap,
    parse_job_description,
    rewrite_single_bullet,
)
from app.coach.chat import coach_chat
from app.config import settings
from app import db as sqlite_db
from app.interview_prep.generator import generate_interview_prep
from app.matching.engine import (
    categorize_match,
    compute_match_breakdown,
    generate_embedding,
    generate_explanation,
)
from app.parser.cv_parser import ALLOWED_CV_EXTENSIONS, UnsupportedFileType, parse_cv
from app.scoring.cv_score_engine import compute_cv_score_breakdown
from app.scoring.interview_signal_engine import compute_interview_signal, merge_match_result
from app.scoring.jd_match_engine import compute_jd_match_breakdown, job_dict_from_jd_text

app = FastAPI(title="CareerSignal", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MatchRequest(BaseModel):
    candidate_id: str
    job_id: str


class GapAnalysisRequest(BaseModel):
    candidate_id: str
    job_id: str
    role_style: str = "ai_product_manager"


class RewriteBulletRequest(BaseModel):
    bullet: str
    job_id: str | None = None
    job_title: str | None = None
    required_skills: list[str] = []
    role_style: str = "ai_product_manager"
    mode: str = "regenerate"


class AtsCheckRequest(BaseModel):
    candidate_id: str
    jd_text: str | None = None
    target_role: str | None = None


class CoverLetterRequest(BaseModel):
    candidate_id: str
    jd_text: str | None = None
    job_id: str | None = None
    job_title: str | None = None
    company_name: str | None = None
    tone: str = "warm"


class InterviewStartRequest(BaseModel):
    candidate_id: str
    role_title: str
    company_name: str | None = None
    mode: str = "behavioral"
    difficulty: str = "medium"


class InterviewAnswerRequest(BaseModel):
    role_title: str
    mode: str = "behavioral"
    question: str
    answer: str


class InterviewNextRequest(BaseModel):
    role_title: str
    mode: str = "behavioral"
    difficulty: str = "medium"
    asked_questions: list[str] = []


class InterviewSummaryRequest(BaseModel):
    role_title: str
    qa_pairs: list[dict[str, str]] = []
    avg_score: float = 0.0


class JobParseRequest(BaseModel):
    job_id: str


class BatchMatchRequest(BaseModel):
    candidate_id: str
    limit: int = 20


class ScoreCvRequest(BaseModel):
    candidate_id: str


class MatchJdRequest(BaseModel):
    candidate_id: str
    jd_text: str
    job_title: str | None = None


class CoachChatRequest(BaseModel):
    candidate_id: str
    message: str


class InterviewPrepRequest(BaseModel):
    candidate_id: str
    job_id: str | None = None


def _extract_cv_bullets(candidate_id: str) -> list[str]:
    """Pull the candidate's real experience bullets from their parsed primary CV."""
    parsed = sqlite_db.get_primary_cv_parsed(candidate_id) or {}
    bullets: list[str] = []
    for exp in parsed.get("experience") or []:
        if not isinstance(exp, dict):
            continue
        for achievement in exp.get("achievements") or []:
            text = str(achievement).strip()
            if text:
                bullets.append(text)
        desc = str(exp.get("description") or "").strip()
        if desc and desc not in bullets:
            bullets.append(desc)
    return bullets[:8]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "careersignal", "database": "postgres"}


@app.post("/parse-cv")
async def parse_cv_endpoint(
    candidate_id: str,
    file: UploadFile = File(...),
    file_path: str | None = None,
):
    filename = file.filename or "cv.pdf"
    if not filename.lower().endswith(ALLOWED_CV_EXTENSIONS):
        raise HTTPException(415, "Unsupported file type. Please upload a PDF or DOCX file.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")

    try:
        result = await parse_cv(content, filename)
    except UnsupportedFileType:
        raise HTTPException(415, "Unsupported file type. Please upload a PDF or DOCX file.")
    parsed = result["parsed"]

    try:
        cv_id = sqlite_db.save_parsed_cv(
            candidate_id=candidate_id,
            file_name=file.filename or "cv.pdf",
            parsed=parsed,
            parsed_text=result["parsed_text"],
            ats_score=result["ats_score"],
            skills=result["skills"],
            embedding=result["embedding"],
            file_path=file_path,
        )
    except Exception as e:  # noqa: BLE001
        # The atomic cv-upload cap trigger raises a check_violation when a Free
        # user exceeds the limit (race backstop). Surface it as 402, not 500.
        if "CV upload limit" in str(e) or getattr(e, "sqlstate", None) == "23514":
            raise HTTPException(402, "CV upload limit reached")
        raise

    candidate = sqlite_db.get_candidate(candidate_id)
    return {
        "success": True,
        "cv_id": cv_id,
        "parsed": parsed,
        "ats_score": result["ats_score"],
        "cv_score": candidate.get("cv_score") if candidate else result["ats_score"],
        "skills_count": len(result["skills"]),
    }


@app.post("/score/cv")
async def score_cv_endpoint(req: ScoreCvRequest):
    candidate = sqlite_db.get_candidate(req.candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    cv_text = sqlite_db.get_primary_cv_text(req.candidate_id) or candidate.get("profile_summary") or ""
    parsed_json = sqlite_db.get_primary_cv_parsed(req.candidate_id) or {}
    skills = sqlite_db.get_candidate_skills(req.candidate_id)
    target_roles = candidate.get("target_roles") or []

    result = compute_cv_score_breakdown(cv_text, parsed_json, skills, target_roles)
    sqlite_db.update_candidate_cv_score(
        req.candidate_id,
        result["overall_score"],
        result["breakdown"],
        result["feedback"],
    )
    return result


@app.post("/match/jd")
async def match_jd_endpoint(req: MatchJdRequest):
    candidate = sqlite_db.get_candidate(req.candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    candidate_skills = sqlite_db.get_candidate_skills(req.candidate_id)
    cv_text = sqlite_db.get_primary_cv_text(req.candidate_id) or candidate.get("profile_summary") or ""

    job = job_dict_from_jd_text(req.jd_text, req.job_title or "Pasted Job")
    if settings.openai_api_key and not job.get("embedding"):
        parsed = await parse_job_description(job["title"], req.jd_text)
        job["required_skills"] = parsed["required_skills"]
        job["nice_to_have_skills"] = parsed["nice_to_have_skills"]
        job["embedding"] = parsed["embedding"]

    jd_breakdown = compute_jd_match_breakdown(candidate, job, candidate_skills, cv_text)
    profile_cv = candidate.get("cv_score") or 60.0
    interview_signal = compute_interview_signal(
        jd_breakdown["jd_match_score"], profile_cv, job, candidate,
    )
    breakdown = merge_match_result(jd_breakdown, interview_signal, job)

    explanation = await generate_explanation(candidate, job, breakdown, candidate_skills)
    current_fit = breakdown["jd_match_score"]
    gap = await analyze_cv_job_gap(candidate, job, cv_text, candidate_skills, current_fit)

    sqlite_db.save_jd_analysis(req.candidate_id, req.jd_text, req.job_title, breakdown, gap)

    return {
        "breakdown": breakdown,
        "explanation": explanation,
        "gap": gap,
        "jd_match_score": breakdown["jd_match_score"],
        "interview_signal": breakdown["interview_signal"],
        "cv_score": profile_cv,
    }


@app.post("/parse-job")
async def parse_job_endpoint(req: JobParseRequest):
    job = sqlite_db.get_job(req.job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    parsed = await parse_job_description(job["title"], job["description"])
    sqlite_db.update_job_parsing(
        req.job_id,
        parsed["required_skills"],
        parsed["nice_to_have_skills"],
        parsed["embedding"],
    )
    return {"success": True, **parsed}


@app.post("/match")
async def match_endpoint(req: MatchRequest):
    candidate = sqlite_db.get_candidate(req.candidate_id)
    job = sqlite_db.get_job(req.job_id)

    if not candidate or not job:
        raise HTTPException(404, "Candidate or job not found")

    candidate_skills = sqlite_db.get_candidate_skills(req.candidate_id)
    cv_text = sqlite_db.get_primary_cv_text(req.candidate_id) or ""

    if not job.get("embedding") and settings.openai_api_key:
        parsed = await parse_job_description(job["title"], job["description"])
        job["required_skills"] = parsed["required_skills"]
        job["nice_to_have_skills"] = parsed["nice_to_have_skills"]
        job["embedding"] = parsed["embedding"]
        sqlite_db.update_job_parsing(
            req.job_id,
            parsed["required_skills"],
            parsed["nice_to_have_skills"],
            parsed["embedding"],
        )

    breakdown = compute_match_breakdown(
        candidate, job, candidate_skills, candidate.get("cv_score"), cv_text,
    )
    explanation = await generate_explanation(candidate, job, breakdown, candidate_skills)
    category = categorize_match(
        breakdown["final_score"],
        breakdown["skill_score"],
        job.get("visa_sponsorship", False),
    )
    explanation["category"] = category

    sqlite_db.upsert_match_score(req.candidate_id, req.job_id, breakdown, explanation)

    return {
        "breakdown": breakdown,
        "explanation": explanation,
        "final_score": breakdown["final_score"],
        "jd_match_score": breakdown.get("jd_match_score"),
        "interview_signal": breakdown.get("interview_signal"),
        "cv_score": candidate.get("cv_score"),
    }


@app.post("/match/batch")
async def batch_match_endpoint(req: BatchMatchRequest):
    jobs = sqlite_db.list_published_jobs(req.limit)
    results = []
    for job in jobs:
        try:
            match_req = MatchRequest(candidate_id=req.candidate_id, job_id=job["id"])
            result = await match_endpoint(match_req)
            results.append({"job_id": job["id"], **result})
        except Exception:
            continue
    results.sort(key=lambda x: x.get("final_score", 0), reverse=True)
    return {"matches": results}


@app.post("/analyze-gap")
async def analyze_gap_endpoint(req: GapAnalysisRequest):
    candidate = sqlite_db.get_candidate(req.candidate_id)
    job = sqlite_db.get_job(req.job_id)

    if not candidate or not job:
        raise HTTPException(404, "Candidate or job not found")

    candidate_skills = sqlite_db.get_candidate_skills(req.candidate_id)
    cv_text = sqlite_db.get_primary_cv_text(req.candidate_id) or candidate.get("profile_summary") or ""
    current_fit = sqlite_db.get_match_final_score(req.candidate_id, req.job_id) or 50.0
    cv_bullets = _extract_cv_bullets(req.candidate_id)

    gap = await analyze_cv_job_gap(
        candidate,
        job,
        cv_text,
        candidate_skills,
        current_fit,
        role_style=req.role_style,
        cv_bullets=cv_bullets,
    )

    explanation = sqlite_db.get_match_explanation(req.candidate_id, req.job_id)
    explanation["cv_gap"] = gap
    sqlite_db.update_match_explanation(req.candidate_id, req.job_id, explanation)

    return gap


@app.post("/rewrite-bullet")
async def rewrite_bullet_endpoint(req: RewriteBulletRequest):
    if not req.bullet.strip():
        raise HTTPException(400, "Bullet text is required")
    if req.mode not in ("regenerate", "senior", "concise"):
        raise HTTPException(400, "Invalid mode")

    job = sqlite_db.get_job(req.job_id) if req.job_id else None
    if not job:
        job = {
            "title": req.job_title or "",
            "required_skills": req.required_skills,
            "nice_to_have_skills": [],
        }

    return await rewrite_single_bullet(req.bullet, job, req.role_style, req.mode)


@app.post("/ats-check")
async def ats_check_endpoint(req: AtsCheckRequest):
    from app.ats.checker import run_ats_check

    cv_text = sqlite_db.get_primary_cv_text(req.candidate_id)
    if not cv_text or len(cv_text.strip()) < 30:
        candidate = sqlite_db.get_candidate(req.candidate_id) or {}
        cv_text = candidate.get("profile_summary") or ""
    if not cv_text or len(cv_text.strip()) < 30:
        raise HTTPException(400, "No CV text found. Upload a CV first.")

    return await run_ats_check(cv_text, req.jd_text, req.target_role)


@app.post("/cover-letter/generate")
async def cover_letter_endpoint(req: CoverLetterRequest):
    from app.cover_letter.generator import generate_cover_letter

    cv_text = sqlite_db.get_primary_cv_text(req.candidate_id)
    candidate = sqlite_db.get_candidate(req.candidate_id) or {}
    if not cv_text:
        cv_text = candidate.get("profile_summary") or ""

    job_title = req.job_title or ""
    company_name = req.company_name or ""
    jd_text = req.jd_text or ""
    if req.job_id:
        job = sqlite_db.get_job(req.job_id)
        company = sqlite_db.get_company_for_job(req.job_id)
        if job:
            job_title = job_title or job.get("title") or ""
            jd_text = jd_text or job.get("description") or ""
        if company:
            company_name = company_name or company.get("name") or ""

    if not jd_text and not job_title:
        raise HTTPException(400, "Provide a job description or title.")

    return await generate_cover_letter(cv_text, candidate, job_title, company_name, jd_text, req.tone)


@app.post("/interview/start")
async def interview_start_endpoint(req: InterviewStartRequest):
    from app.interview.studio import start_interview

    return await start_interview(req.role_title, req.company_name, req.mode, req.difficulty)


@app.post("/interview/answer")
async def interview_answer_endpoint(req: InterviewAnswerRequest):
    from app.interview.studio import score_answer

    if not req.answer.strip():
        raise HTTPException(400, "Answer is required")
    return await score_answer(req.role_title, req.mode, req.question, req.answer)


@app.post("/interview/next")
async def interview_next_endpoint(req: InterviewNextRequest):
    from app.interview.studio import next_question

    return await next_question(req.role_title, req.mode, req.difficulty, req.asked_questions)


@app.post("/interview/summary")
async def interview_summary_endpoint(req: InterviewSummaryRequest):
    from app.interview.studio import summarize_session

    return await summarize_session(req.role_title, req.qa_pairs, req.avg_score)


@app.post("/embed-candidate")
async def embed_candidate_endpoint(candidate_id: str):
    candidate = sqlite_db.get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    skills = sqlite_db.get_candidate_skills(candidate_id)
    text = f"{candidate.get('current_title', '')} {candidate.get('profile_summary', '')} {' '.join(skills)}"
    embedding = await generate_embedding(text)
    sqlite_db.update_candidate_embedding(candidate_id, embedding)
    return {"success": True}


@app.post("/coach/chat")
async def coach_chat_endpoint(req: CoachChatRequest):
    candidate = sqlite_db.get_candidate(req.candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    if not req.message.strip():
        raise HTTPException(400, "Message is required")

    response = await coach_chat(req.candidate_id, req.message.strip())
    return {"response": response}


@app.post("/interview-prep/generate")
async def interview_prep_generate_endpoint(req: InterviewPrepRequest):
    candidate = sqlite_db.get_candidate(req.candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    if req.job_id and not sqlite_db.get_job(req.job_id):
        raise HTTPException(404, "Job not found")

    try:
        prep = await generate_interview_prep(req.candidate_id, req.job_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc

    return prep
