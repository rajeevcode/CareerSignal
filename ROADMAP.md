# CareerSignal Roadmap

## Phase C — Job Search (mostly complete)

- Job listings, filters, recommended jobs
- Save / apply with JD Match + Interview Signal stored on applications
- Extend application statuses: HR Screen, Case Study, Follow-up Needed
- Align all copy to Interview Signal bands

## Implemented candidate workflow — October 17, 2026

- Record-backed daily action queue; real overdue follow-ups, interview-stage preparation links, and CV feedback.
- Persistent stage changes, private next-action notes, seven-day reminder snoozes, and completion.
- Candidate ownership and optimistic concurrency checks on updates.
- Application analytics by exact job title with explicit sample sizes, pending outcomes, and response definitions.
- Deterministic JD/CV source excerpts, persisted with the analysis and a scoring version.
- Authenticated, bounded batch matching with visible unavailable state.
- Atomic monthly JD quota reservation and failure refunds, including month rollover handling.
- Notice-period parsing and neutral defaults for unknown competition; primary signal UI uses points out of 100.

## Four candidate phases — implementation complete

- Submission snapshots and stage history are recorded by database triggers; older applications retain an explicit unknown-history baseline.
- Private per-application workspaces include CV content, source job description, related contacts, cover letters, notes, and stage controls.
- Score history compares identical source-job fingerprints; CV/scoring differences stay explicit.
- Outcome cohorts cover submitted CV versions, source hosts and countries. Observed calibration is withheld until enough mature outcomes with complete known provenance exist.
- Candidate-reviewed STAR stories require a real source excerpt and are reused in interview preparation.
- Browser capture transfers active-tab job text for review, deduplicates postings and stores private opportunities.
- Google inbox/calendar connections have opt-in OAuth, encrypted tokens, bounded read-only sync, reviewed stage suggestions and disconnect/revocation.
- A maintenance worker persists in-app reminders and reconciles crashed quota reservations; stored successful requests can be replayed idempotently.

See [candidate phase implementation and verification](docs/CANDIDATE_PHASES.md) for setup, acceptance boundaries and the repeatable automated check. Live Google-account acceptance requires configuration and consent; extension-store publication is not part of local implementation.

## Phase D — Career Dashboard & Journey

Inspired by career journey tools (not branded as any competitor product):

- Career goals (target role, country, salary, timeline)
- Auto-generated career roadmap (weekly plan)
- Application analytics (response rate by role/country)
- Follow-up reminders (7-day nudge)
- Networking tracker
- Interview prep per job (STAR stories, likely questions)
- Full AI Career Coach chat

## Phase E — Recruiter + University B2B

**Recruiter:** Company profiles, post jobs, AI shortlist, messaging, hiring analytics

**University:** Student dashboards, career center analytics, bulk CV review, employer partnerships

Deferred until candidate wedge proves retention.
