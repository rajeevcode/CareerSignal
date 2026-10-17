
# Advanced Career Platform Features

Benchmarking CareerSignal against **VMock** (CV scoring, line-by-line feedback, resume benchmarking), **CareerOS** (kanban pipeline, networking CRM, interview prep), **Naukri** (job alerts, recruiter visibility, profile completeness), **Teal HQ** (job tracker + resume tailoring), and **Huntr** (contacts + tasks per application).

## What's already built
Auth, jobs, applications kanban pipeline, saved jobs, CV storage, basic CV scoring tables, profiles, target roles, candidate preferences, pricing.

## Proposed new features (pick what to build)

### 1. AI Resume Doctor (VMock-style)
- Line-by-line CV analysis: action verbs, quantification, bullet strength, ATS keyword match vs a target JD.
- Visual radar score: Impact / Brevity / Style / ATS / Skills Match.
- One-click "Rewrite this bullet" + "Tailor CV to this job" → produces a tailored CV version stored in `cv_versions`.
- ATS simulator: parses CV like an ATS would and shows what recruiters actually see.

### 2. JD ↔ CV Match Engine
- Paste/select a job → AI returns match %, missing keywords, missing skills, suggested bullets to add.
- "Auto-tailor" button creates a new CV version per application, linked in the pipeline card.

### 3. Interview Prep Studio (CareerOS-style)
- AI-generated interview questions per job (behavioral, technical, company-specific).
- Mock interview chat: AI interviewer, scores answers (STAR structure, clarity, specificity).
- Saved answer bank reusable across applications.

### 4. Networking CRM (CareerOS / Huntr-style)
- `contacts` table: recruiters, referrers, hiring managers, linked to companies/applications.
- Per-application tasks & follow-up reminders ("email recruiter in 5 days").
- Email templates: cold outreach, referral ask, thank-you, follow-up — AI-personalized to contact + role.

### 5. Application Insights & Analytics
- Funnel: Saved → Applied → Interview → Offer conversion rates.
- Time-in-stage, response-rate per company, weekly activity streak.
- AI weekly digest: "You applied to 12 roles, 3 stalled at Applied — here's why and what to do."

### 6. Smart Job Discovery
- Daily AI-curated job matches based on target roles + preferences + CV.
- Match score + "why this fits you" reasoning on each card.
- Saved searches with email/in-app alerts (Naukri-style).

### 7. LinkedIn / Profile Optimizer
- Paste LinkedIn URL or headline/about → AI rewrites headline, about, experience bullets.
- Profile completeness score with actionable checklist.

### 8. Salary & Offer Intelligence
- Salary benchmarks by role/location/experience (seeded data + AI estimate).
- Offer comparison tool: side-by-side TC, equity, benefits, with AI recommendation.
- Negotiation script generator.

### 9. Company Research Briefs
- One-click AI brief per company in pipeline: recent news, culture signals, interview style, common questions.
- Cached per company in `companies` table.

### 10. Document Vault
- Multiple CV versions + cover letters per application, with diff view.
- AI cover letter generator scoped to a specific JD + CV.

## Recommended first build (highest impact, fits existing schema)

Build these three together — they reinforce each other and use what exists:

1. **AI Resume Doctor + JD Match** (feature 1 + 2) — leverages `cvs`, `cv_versions`, `cv_scores`, `jobs`. Core differentiator.
2. **Interview Prep Studio** (feature 3) — new `interview_sessions` + `interview_questions` tables, ties to `applications`.
3. **AI Cover Letter + Tailored CV per application** (subset of feature 10) — extends pipeline cards with "Generate documents".

All AI runs through Lovable AI Gateway (`google/gemini-3-flash-preview`) via `createServerFn` with `requireSupabaseAuth`. New tables get RLS + GRANTs scoped to owner.

## Technical sketch

```text
src/lib/
  resume-doctor.functions.ts   analyzeCv, rewriteBullet, tailorCvToJob
  jd-match.functions.ts        scoreJobAgainstCv, missingKeywords
  interview.functions.ts       generateQuestions, scoreAnswer, mockInterviewTurn
  cover-letter.functions.ts    generateCoverLetter

src/routes/_authenticated/
  cv-doctor.tsx                radar score + bullet-level feedback UI
  cv-doctor.$cvId.tsx          per-CV deep dive
  interview-prep.tsx           question bank + start mock
  interview-prep.$jobId.tsx    job-specific prep + chat
  pipeline.tsx (extend)        per-card "Tailor CV" / "Cover letter" / "Prep interview"

supabase/migrations/<ts>_advanced_features.sql
  interview_sessions(id, user_id, job_id, application_id, mode, score, created_at)
  interview_questions(id, session_id, question, answer, ai_feedback, score)
  cv_analyses(id, cv_id, user_id, target_job_id?, scores jsonb, feedback jsonb, created_at)
  cover_letters(id, application_id, user_id, cv_version_id, content, created_at)
  contacts(id, user_id, company_id?, application_id?, name, role, email, linkedin, notes)
  -- all: GRANT to authenticated + service_role, ENABLE RLS, owner-only policies
```

## Out of scope for first pass
Networking CRM, salary intelligence, LinkedIn optimizer, company briefs, analytics dashboard — leave as follow-ups once the core CV+Interview loop is live.

## Confirm before I build
Reply with which set to ship first:
- **A** — All three recommended (Resume Doctor + JD Match + Interview Prep + Cover Letters). ~larger build.
- **B** — Just Resume Doctor + JD Match + Cover Letter (skip interview prep for now).
- **C** — Just Interview Prep Studio.
- **D** — Different combination (tell me which numbered features).
