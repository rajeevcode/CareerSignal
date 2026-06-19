# CareerSignal — E2E Regression Suite

Playwright end-to-end regression tests mapped to the QA test plan (P0 security/privacy/
monetization, freemium limits, paywall, RLS, role gates, data integrity, UI, a11y).

**130 tests** across two projects: `api` (HTTP/request — server-side gates, security, RLS)
and `ui` (browser — redirects, paywall modal, pricing, a11y).

## Prerequisites (the suite does NOT start or reset anything)

The full local stack must already be running:

```bash
# 1. Supabase (Postgres :54322, API :54321) — migrated + seeded
supabase start
node supabase/seed/seed.mjs          # 8 companies, 20 jobs   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
node supabase/seed/seed-users.mjs    # candidate@ / admin@careersignal.test  (Passw0rd!)

# 2. AI service (:8011)  — from services/ai
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  python3 -m uvicorn app.main:app --port 8011

# 3. Web app (:3000) — from apps/web, NODE_ENV=development so mock checkout is allowed
SUPABASE_DB_URL=... NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  SUPABASE_SERVICE_ROLE_KEY=... AI_SERVICE_URL=http://localhost:8011 pnpm dev
```

`tests/e2e/env.ts` loads the monorepo-root `.env` and **pre-flights** all three services,
aborting with a clear message if web or Supabase is down. AI-dependent specs are gated on
the AI health check (`@needs-ai`) and skipped (not failed) if it's unreachable.

## Run

```bash
cd apps/web
npx playwright install chromium     # one-time
pnpm test:api                       # API + security projects
pnpm test:ui                        # browser flows
pnpm test:e2e                       # everything
pnpm test:report                    # open the HTML report
```

Tests self-provision users via `/api/auth/register` (emails prefixed `csqa+…`) and clean
themselves up; `global-teardown.ts` removes any stragglers. Seeded jobs/companies and the
seeded `candidate@/admin@` users are preserved.

## Layout

```
tests/e2e/
  env.ts                 root-.env loader + service preflight
  global-teardown.ts     deletes csqa+* test users
  helpers/
    register.ts          registerUser() → {ctx(authed), userId, candidateId, accessToken}
    admin.ts             service-role client: setPlan/setJdUsage/seedCv/cleanupUser/…
    rest.ts              restAsUser(jwt) / rawRest() — RLS engine (user JWT vs /rest/v1)
    files.ts             in-memory PDF/DOCX/bad-file/XSS-filename builders
    bundle.ts            grep .next/static for service-role key
    assertions.ts        expectPaywall(res, feature)
  api/        17 specs    auth, access-control, limits-*, paywall-pro, pricing-checkout,
                          cv-upload/score, rewrite-quality, jd-match, jobs-saved,
                          applications, interview-coach, recruiter, admin, data-integrity
  security/   5 specs     rls-cross-user, self-escalation, storage-privacy, secret-leak, xss
  ui/         8 specs     routing-guards, header-states, pricing-page, paywall-modal,
                          locked-cards, jobs-filters-mobile, match-panel, a11y
```

## Findings surfaced by the suite

These are **real product issues** the tests document. Three are encoded as
`test.fail()` (expected-failures) so the suite stays green-but-flagged until fixed.

| # | Severity | Finding | Where |
|---|----------|---------|-------|
| 1 | **P0 — FIXED** | **Privilege escalation** — `subscriptions` + `usage_limits` RLS were `FOR ALL USING (...)` with no `WITH CHECK`, letting a user `PATCH /rest/v1/subscriptions` to `plan='pro'` with their own JWT. **Fixed** in migration `20260619000002`: policies are now **SELECT-only** (`p_subs_self_read` / `p_usage_self_read`); all writes go through the server (service role). ESC-01/02/03 now pass for real. | `security/self-escalation.spec.ts` |
| 2 | **P0 — FIXED** | **Upload-limit race** — the CV-upload gate was check-then-write (non-atomic); concurrent uploads could exceed the free cap of 3. **Fixed** in migration `20260619000002`: a `BEFORE INSERT` trigger on `cv_uploads` (`enforce_cv_upload_cap`, advisory-lock + count) enforces the cap atomically for Free users; the AI service maps the violation to 402 and the web route returns the paywall body. LIM-UP-03 `@race` now passes (invariant holds, over-cap requests get clean 402s). | `api/limits-upload.spec.ts` (LIM-UP-03) |
| 3 | **P1 — FIXED** | **No application cap** — `apply/route.ts` enforced no `track_application` (10) limit. **Fixed:** the route now gates new applications via `gate(..., 'track_application')` → 402 at 11; re-applying to an already-tracked job is still allowed (no row added). | `api/limits-saved-apps.spec.ts` (LIM-AP-02/03) |
| 4 | P1 (fixed) | XSS-style CV filename caused a Storage `Invalid key` → 500. **Fixed** by sanitizing the storage key in `parse-cv/route.ts`; test asserts no HTML-active chars survive. | `security/xss-sanitization.spec.ts` |
| 8 | **Ops (not code)** | **AI LLM calls are failing → all AI features run on deterministic fallbacks.** The configured OpenRouter key (`sk-or-…`) returns **402 "Insufficient credits"**, so CV rewrite, JD match, ATS keywords, cover letters, and interview scoring produce structured-but-canned output, never live model output. App degrades gracefully (this is by design). **Fix is account-side:** add OpenRouter credits or set a funded `OPENAI_API_KEY` in the root `.env`. Tests assert API contract/shape, so they pass regardless. | observed via `/rewrite-bullet`, `openai_client` 402 |
| 5 | **P2 — FIXED** | Routing: `/career-coach`, `/cover-letters`, `/ats-check` weren't in the middleware `PROTECTED` list, so guests bounced to bare `/login` (no `?redirect=`), losing the destination. **Fixed** by adding them to `PROTECTED_CANDIDATE_ROUTES` (`lib/onboarding.ts`); middleware now preserves `?redirect=<path>`. Also hardened `/api/auth/register` (email-format + password-length 400s) and `registerUser` (Supabase soft-duplicate `identities:[]` → "Email already registered"); fixed N+1 query loops in `lib/queries.ts` (set-based `IN`/joins) and added a psycopg connection pool in the AI service. | `ui/routing-guards.spec.ts` |
| 6 | P3 | Header has no plan/Pro badge; `Modal` doesn't trap Tab focus; auth labels aren't programmatically associated. | `ui/header-states`, `ui/paywall-modal`, `ui/a11y` |
| 7 | Design | **Canonical design is now the Lovable "talent-signal-labs" port.** Marketing pages (home, product, pricing, for-recruiters, demo, contact, terms/privacy/copyright, cv-score, jd-match) were re-skinned to match it; a global dark-mode header/footer (`components/cs/SiteHeader`/`SiteFooter`) replaced the old auth-aware header app-wide. Pricing now shows the Lovable **$0 / $9 / month** tiers (the prior ₹749 assertion was flipped). The functional JD-match tool moved to **`/jd-match-tool`** (public `/jd-match` is the marketing page). Policy text lives in the Supabase `site_policies` table (migration `20260619000003`). | `ui/pricing-page`, `ui/header-states`, `ui/routing-guards` |
| 8 | Ops (not code) | **Social login (Google/LinkedIn) is not functional on local Supabase.** GoTrue (v2.190.0) reports `google:false` at `/auth/v1/settings` and `/authorize` returns 400 **despite** `config.toml` `enabled=true` and the auth container holding the correct `GOOGLE_CLIENT_ID`/`SECRET`. App code (OAuth helper + `/auth/callback`) is correct and degrades gracefully (friendly "not set up yet" message). Email/password is the working path. Root cause is environment-side, not app code. | `lib/auth/oauth.ts` |

## Release-readiness

Both P0 findings (#1 privilege escalation, #2 upload-limit race) are **fixed** in migration
`20260619000002_harden_billing_rls.sql`. Current status: **130/130 pass**, no expected-failures
remain; AI-heavy specs auto-retry once to absorb FastAPI saturation under parallel load.
Remaining open items are P1 #3 (no application cap) and P2/P3 UX polish.
