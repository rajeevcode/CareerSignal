# Candidate phases — automated verification

Run completed: 2026-10-17T21:02:43.671Z

Result: **PASSED — all 15 automated checks passed.**

| Test suite | Result |
|---|---|
| Unit | 114 passed |
| Postgres integration | 22 passed |
| Python/backend | 12 passed |
| Desktop/mobile browser acceptance | 14 passed |

| Check | Status |
|---|---|
| shared-types | passed |
| database-types | passed |
| unit-tests | passed |
| postgres-integration | passed |
| backend-tests | passed |
| migration-replay | passed |
| database-security | passed |
| lint | passed |
| typescript | passed |
| production-build | passed |
| extension-syntax | passed |
| compose-config | passed |
| compose-development-config | passed |
| compose-production-local-config | passed |
| desktop-mobile-workflows | passed |

Acceptance runs against the production Next.js build. The browser suite fails on runtime exceptions and exercises capture/deduplication, immutable job/CV snapshots, stage history, contacts, source-verified stories, score history, outcome cohorts, reviewed calendar suggestions, private-record isolation, browser popup handoff, quota recovery, the real web-to-Python deterministic analysis path, and concurrent application/idempotency behavior. Desktop and dark-mode mobile acceptance passed. Added regression cases cover foreign private-job IDs, forged saved references, concurrent saved-job limits, saved-application submission dates/counters, and system/cross-tab theme changes.

The migration replay runs inside a rolled-back transaction. Local schema and ownership grants were checked without changing production data. The local migration ledger records version `20261017081911`.

## Provider acceptance boundaries

Google consent, refresh, sync, source rescheduling, cancellations and grant isolation were tested against a mocked provider. **No real Google account was connected.** Configure application OAuth credentials and obtain user consent for live acceptance. Paid AI calls and outbound email were disabled in automated acceptance; missing rewrite generation renders unavailable rather than placeholder achievements or an unmeasured uplift.

## Existing Supabase advisor warnings

- Function `public.update_updated_at` has a role mutable search_path
- Extension `vector` is installed in the public schema. Move it to another schema.

No advisor errors were reported. These existing warnings remain open; the passing workflow permission check is scoped to the new tables/functions.

Raw logs and machine-readable results are available locally under `tmp/codex-careersignal-checks/`. Rerun with `pnpm check:all-phases` as documented in [the setup guide](CANDIDATE_PHASES.md).

## Code review and release checks

See [CODE_REVIEW.md](CODE_REVIEW.md) for findings and fixes. Production dependency audit: **zero vulnerabilities** after framework/ORM/analytics updates and targeted transitive patches. The pnpm 9.15.0 frozen lockfile check passed. Scoped unit coverage for billing, onboarding and request utilities passed its gates: 100% lines/statements/functions and 96.73% branches; this is not whole-repository coverage. Staged diff whitespace and secret/artifact checks passed. No live Google account or paid provider acceptance is claimed.
