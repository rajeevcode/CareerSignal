import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/workflow-ui', workers: 1, retries: 0, timeout: 60_000,
  expect: { timeout: 15_000 }, reporter: 'list', outputDir: './test-results/workflow',
  use: { channel: process.env.PLAYWRIGHT_CHANNEL, baseURL: 'http://localhost:3089', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-dark', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', colorScheme: 'dark' } },
  ],
});
