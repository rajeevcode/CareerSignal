# CareerSignal code review

Reviewed the pending candidate-phase implementation, surrounding authentication and job access paths, application submission, saved-job quotas, Google consent and synchronization, migrations, deployment configuration, and browser behavior.

## Findings addressed

- **P1 — Private-job disclosure through privileged backends.** Job IDs accepted by save, gap analysis, interview preparation, cover-letter and bullet-rewrite APIs could refer to another candidate's private capture. Added owner-or-published visibility checks before AI work, owner-scoped Python job lookups, and defensive filtering when saved/matched/application jobs are hydrated. Regression coverage attempts foreign-job requests and injects a forged saved reference to verify the page cannot reveal the private job.
- **P1 — Vulnerable locked dependencies.** The production dependency audit reported high and critical advisories in the framework/database dependency tree. Updated Next.js and its ESLint configuration to 16.3.8, Drizzle ORM to 0.45.2, and PostHog to 1.438.12. Targeted root overrides pin patched shell-quote, browserslist, fflate, baseline-browser-mapping and source-map-js versions. The final `pnpm audit --prod` reports zero vulnerabilities. Revisit the overrides when upstream ranges resolve safe versions without them.
- **P2 — Concurrent saved-job quota bypass.** Independent count/insert operations admitted simultaneous requests past the free cap. Saves/removals now serialize per candidate, make retries idempotent, validate input, and check visibility. Browser acceptance sends concurrent saves and checks the cap, retries, deletion and recovered capacity.
- **P2 — Saved application submission metadata.** First submission of a saved application retained its save date and missed applicant-count/score updates. First submission now records the actual timestamp and current selected CV/match, increments once, and sends confirmation once. Subsequent retries preserve the submission and existing stages. Manual first stage transitions also record submission time, while restoring a historical submission preserves its original date.
- **P2 — Theme changes did not update the document.** The layout also imported an inline script string across a client-component boundary; the script now lives in a shared module so server rendering receives actual JavaScript. React's external theme store reacted to system or other-tab changes without updating document classes. The provider now synchronizes the document; desktop/mobile acceptance covers both paths.
- **P2 — Development startup.** Development defaults to Webpack to avoid the observed Turbopack process-spawn failure on this host.

## Scope and limits

The repeatable runner tests the production build against local Supabase/Postgres and actual browser-to-web-to-Python flows. Development remains on Webpack; production acceptance avoids development hot-reload interference. Google uses a mocked provider; no real account consent or paid AI generation is included. This review is not an independent penetration test. Existing Supabase warnings for the legacy `update_updated_at` search path and the public `vector` extension are documented in `CANDIDATE_VERIFICATION.md`.

Unrelated editor settings, design exports, research submissions and temporary artifacts are excluded from the application commit.
