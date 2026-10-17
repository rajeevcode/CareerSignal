# CareerSignal

**Build your CV. Match any job. Know your interview signal.**

CareerSignal is your AI career intelligence platform — from CV score to interview signal. It helps candidates build stronger CVs, match against job descriptions, explain a heuristic interview-fit signal, discover high-fit jobs, and manage their job search journey.

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
3. **Interview Signal** — heuristic points out of 100 (50% JD Match + 20% CV Score + job context), not a calibrated interview probability. Missing applicant counts use a neutral default.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Database | Supabase Postgres via Drizzle ORM (`@careersignal/db`) |
| Auth | Supabase Auth with SSR session cookies |
| AI Service | FastAPI, OpenAI, PyMuPDF |
| Monorepo | pnpm workspaces (`@careersignal/*`) |

## Quick Start

Configure `.env` from `.env.example` with your Supabase connection and auth settings.
The web backend uses a privileged database connection; candidate queries must always
scope by the authenticated candidate. Configure matching internal tokens for web and AI.

```bash
pnpm install
pnpm build
# Apply the existing migrations to your configured Supabase project before starting.
# Terminal 1
cd services/ai && uvicorn app.main:app --reload --port 8000
# Terminal 2 (repository root)
pnpm dev:web
```

The dashboard now derives follow-ups and preparation tasks from application records.
The application board supports stage updates, private next-action notes, seven-day
snoozes, and reminder completion. Analytics use recorded employer-response stages;
views and reminders do not count as responses. No interview dates or stage history
are inferred. Completed follow-ups preserve private notes.

See [ROADMAP.md](./ROADMAP.md) for Phase C–E deferred features.

## Docker Compose

Copy the environment template and configure Supabase plus the AI provider:

```bash
cp .env.example .env
# Edit .env — set the Supabase URLs/keys, SUPABASE_DB_URL,
# OPENAI_API_KEY, and a strong shared INTERNAL_API_TOKEN.
```

**Development** (hot reload for web + AI):

```bash
mkdir -p data/uploads
docker compose --profile setup run --rm migrate   # first time only
docker compose up --build
```

- Web: http://localhost:3000  
- AI: http://localhost:8000  

**Production** (minimal standalone web image, non-root AI image, migrations,
health checks, read-only containers, and private service networking):

```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

To run that production stack against the local Supabase CLI containers, merge
the local host-network override:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d
```

The one-shot `migrate` service applies each SQL file in `supabase/migrations`
once and records it in `public.careersignal_schema_migrations`. Supabase Auth,
Storage, PostgREST, and Postgres remain supplied by your configured Supabase
project; the application containers do not expose the AI service publicly.

## Workflow verification

```bash
pnpm --filter @careersignal/web test
pnpm --filter @careersignal/web lint
pnpm build
# Python dependencies from services/ai/requirements.txt must be installed.
PYTHONPATH=services/ai python -m unittest discover -s services/ai/tests -v
```

The Postgres integration suite deliberately refuses any database except the disposable
local test endpoint on port 55439. It creates and removes a unique test schema:

```bash
docker run --detach --rm --name careersignal-verification-pg \
  --publish 127.0.0.1:55439:5432 --env POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine
CAREERSIGNAL_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/postgres \
  pnpm --filter @careersignal/web test:integration
docker stop careersignal-verification-pg
```

Browser workflow tests need the configured **local** Supabase stack (including the
local mail catcher), seeded jobs, and the web app on port 3089. They create and remove
their own test accounts and avoid provider-backed AI calls:

```bash
pnpm --filter @careersignal/web exec next dev --port 3089
# In a second terminal; install Playwright Chromium first, or set PLAYWRIGHT_CHANNEL=chrome.
E2E_BASE_URL=http://localhost:3089 pnpm --filter @careersignal/web test:workflow
```

Durable request records now prevent duplicate in-flight matches, replay stored responses,
and allow the maintenance worker to refund expired reservations after a crash. See
[the four-phase implementation guide](docs/CANDIDATE_PHASES.md) for integration setup,
provenance rules, known limits, and `pnpm check:all-phases`.
