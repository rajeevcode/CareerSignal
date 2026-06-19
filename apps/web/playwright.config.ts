import { defineConfig, devices } from '@playwright/test';

/**
 * CareerSignal E2E regression suite.
 *
 * PRECONDITION: the full local stack must already be running —
 *   - Supabase:  http://127.0.0.1:54321 (API) + :54322 (Postgres), migrated + seeded
 *   - AI service: http://localhost:8011
 *   - Web app:    http://localhost:3000  (pnpm dev, NODE_ENV=development)
 * The harness (tests/e2e/env.ts) pre-flights these and aborts with a clear
 * message if any is down. We intentionally do NOT auto-start a webServer.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalTeardown: './tests/e2e/global-teardown.ts',
  fullyParallel: true,
  // The AI FastAPI service is a shared singleton; too many concurrent LLM-backed
  // calls can saturate it. Keep parallelism modest and allow one retry so a
  // transient AI-saturation flake self-heals (app logic is asserted, not timing).
  workers: process.env.CI ? 2 : 3,
  retries: 1,
  timeout: 45_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: ['api/**/*.spec.ts', 'security/**/*.spec.ts'],
    },
    {
      name: 'ui',
      testMatch: ['ui/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
