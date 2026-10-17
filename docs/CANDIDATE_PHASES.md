# Candidate phases: implementation and verification

These are the four candidate phases agreed in this chat. Recruiter/university B2B is a separate future roadmap.

| Phase | Implemented behavior | Automated acceptance |
|---|---|---|
| 1: Correctness | Notice-period parsing, unknown competition, explicit score units/version provenance, authenticated bounded matching, transactional application creation, durable idempotency and quota recovery | Unit tests, real Postgres contention tests, real web-to-Python analysis with paid providers disabled |
| 2: Workflow | Real daily actions, follow-ups, private notes, contacts, CV selection, immutable submission snapshots, append-only stage history and per-application workspaces | Desktop/mobile browser tests, owner isolation, immutable-record checks, repeated application requests |
| 3: Differentiation | JD/CV source evidence, same-job score history, CV-version/source/country outcome cohorts, uncertainty-aware observed calibration, candidate-reviewed STAR stories reused in preparation | Source and excerpt checks, snapshot and history fixtures, cohort/boundary/sample-size tests |
| 4: Integrations | Active-tab browser capture and deduplication; read-only Google OAuth with separate inbox/calendar consent, encrypted server-only tokens, bounded sync, reviewed suggestions and disconnect/revocation | Capture handoff, API contracts against mocked Google, OAuth replay/forgery checks, refresh, sync deduplication, review-before-mutation and revocation cleanup |

## Deployment

1. Apply `supabase/migrations/20261017081911_complete_candidate_workflow.sql` using the existing migration pipeline, then rebuild **both** web and AI services. Older scores deliberately retain an unknown version; older applications do not acquire invented historical snapshots.
2. Run `career-maintenance` from `docker-compose.prod.yml`, or deploy `deploy/k8s/career-maintenance.yaml` with your release image and server database secret. It checks due reminders and expired reservations every 60 seconds. Delivery is in-app; it sends no email.
3. For Google connections, configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and a base64 32-byte `CAREER_TOKEN_ENCRYPTION_KEY`. Register the exact redirect URI in Google Cloud, enable Gmail and Calendar APIs, and configure the read-only consent scopes. Store and back up the encryption key as a server secret; changing it without re-encrypting stored credentials requires reconnecting accounts.
4. Load `extensions/job-capture` as an unpacked Chrome/Edge extension during local review. Log in to CareerSignal and configure the app origin before capture. Public extension-store distribution is a separate publication step.

Google references: [OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list), [Calendar events list](https://developers.google.com/calendar/api/v3/reference/events/list).

## Repeatable automated check

Start the existing **local** Supabase stack, including its mail catcher, with migrations applied and jobs seeded. Start a disposable Postgres on port 55439 as described in the README. Stop any web/AI processes on ports 3089 and 8011.

```bash
CAREERSIGNAL_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/postgres \
CAREERSIGNAL_PYTHON=/path/to/python-with-services-ai-requirements \
PLAYWRIGHT_CHANNEL=chrome \
pnpm check:all-phases
```

The runner builds shared/database packages, runs unit, Postgres and Python tests, replays the migration inside a rolled-back transaction, audits database permissions, runs lint/type/build checks, validates extension syntax and Compose, then starts isolated web and Python processes for desktop/mobile acceptance. It disables paid AI-provider and outbound-email calls. It refuses remote database/API endpoints and creates/deletes only its own account fixtures.

Reports and per-check logs are written to `tmp/codex-careersignal-checks/report.json`. Screenshots are under `apps/web/test-results/workflow/`. These generated directories are ignored because traces may include disposable test session cookies.

## Interpretation limits

- Live Google sign-in/sync is a separate acceptance step requiring configured application credentials and the user's OAuth consent. The automated suite verifies real adapter code against a mocked provider; it does not claim a real Google account was connected.
- Interview rates require at least 30 closed applications per score band, at least 14 days old, with complete recorded history and known current scoring provenance. Smaller cohorts show **Insufficient data**. Rates and Wilson intervals describe observed outcomes; they are not a causal claim or a probability for a new application.
- Missing country, source, CV, prior stages, and old score versions stay unknown.
- An AI provider may have processed a request before a crash. The durable ledger prevents duplicate in-flight requests and replays stored responses; after an expired, failed reservation, retrying with a new key can invoke the provider again. It does not promise exactly-once execution by an external provider.
- The Supabase security advisor found two existing warnings during implementation: mutable search path on `public.update_updated_at`, and `vector` installed in `public`. The new workflow tables/functions have separate access-control checks. The advisor warnings are not silently marked as cleared.

Calendar reschedules require fresh approval before their changed dates are used. Explicit cancellations remove the imported event without silently changing the application stage. All-day events have no fabricated clock time. Reconnecting clears the old imports, and in-flight sync results from an older consent grant are rejected. Direct database writes cannot attach applications to another candidate's private captured job or change an application's identity.
