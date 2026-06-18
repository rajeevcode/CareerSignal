# CareerSignal

**Build your CV. Match any job. Know your interview signal.**

CareerSignal is your AI career intelligence platform — from CV score to interview signal. It helps candidates build stronger CVs, match against job descriptions, estimate shortlisting probability, discover high-fit jobs, and manage their job search journey.

## MVP Features

- Candidate signup + guided onboarding
- CV upload with **8-dimension CV Score** and categorized feedback
- **JD Match** — paste any job description for match + Interview Signal
- Job search with filters and recommended jobs
- Explainable match breakdown (CV Score, JD Match, Interview Signal)
- CV gap analysis and rewrite suggestions
- Application tracker + Career Dashboard
- Admin job/company management

## Scoring Architecture

Three layers:

1. **CV Score** — profile quality (ATS, formatting, keywords, impact, role clarity, etc.)
2. **JD Match Score** — CV vs specific job (skills, experience, seniority, keywords, location, salary)
3. **Interview Signal** — composite estimate (50% JD Match + 20% CV Score + job context)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Database | SQLite via Drizzle ORM (`@careersignal/db`) |
| Auth | JWT session cookies |
| AI Service | FastAPI, OpenAI, PyMuPDF |
| Monorepo | pnpm workspaces (`@careersignal/*`) |

## Quick Start

```bash
pnpm install
mkdir -p data
DATABASE_PATH=./data/careersignal.db pnpm db:push
DATABASE_PATH=./data/careersignal.db pnpm db:seed

# Terminal 1 — AI service
cd services/ai && DATABASE_PATH=../../data/careersignal.db uvicorn app.main:app --reload --port 8000

# Terminal 2 — Web
DATABASE_PATH=./data/careersignal.db pnpm dev:web
```

See [ROADMAP.md](./ROADMAP.md) for Phase C–E deferred features.

## Docker Compose

Copy env and set your OpenAI key:

```bash
cp .env.example .env
# Edit .env — at minimum OPENAI_API_KEY and AUTH_SECRET
```

**Development** (hot reload for web + AI):

```bash
mkdir -p data/uploads
docker compose --profile setup run --rm migrate   # first time only
docker compose up --build
```

- Web: http://localhost:3000  
- AI: http://localhost:8000  

**Production-style** (optimized Next.js standalone image):

```bash
mkdir -p data/uploads
docker compose -f docker-compose.prod.yml --profile setup run --rm migrate
docker compose -f docker-compose.prod.yml up --build -d
```
