from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.analyzer.cv_job_analyzer import analyze_cv_job_gap, parse_job_description
from app.config import settings
from app import db as sqlite_db
from app.matching.engine import (
    categorize_match,
    compute_match_breakdown,
    generate_embedding,
    generate_explanation,
)
from app.parser.cv_parser import parse_cv
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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "careersignal", "database": "sqlite"}


@app.post("/parse-cv")
async def parse_cv_endpoint(
    candidate_id: str,
    file: UploadFile = File(...),
):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")

    result = await parse_cv(content, file.filename or "cv.pdf")
    parsed = result["parsed"]

    cv_id = sqlite_db.save_parsed_cv(
        candidate_id=candidate_id,
        file_name=file.filename or "cv.pdf",
        parsed=parsed,
        parsed_text=result["parsed_text"],
        ats_score=result["ats_score"],
        skills=result["skills"],
        embedding=result["embedding"],
    )

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

    gap = await analyze_cv_job_gap(candidate, job, cv_text, candidate_skills, current_fit)

    explanation = sqlite_db.get_match_explanation(req.candidate_id, req.job_id)
    explanation["cv_gap"] = gap
    sqlite_db.update_match_explanation(req.candidate_id, req.job_id, explanation)

    return gap


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
