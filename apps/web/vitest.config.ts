import { defineConfig } from 'vitest/config';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': fileURLToPath(new URL('./tests/integration/server-only.ts', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/billing.ts', 'src/lib/onboarding.ts', 'src/lib/utils.ts'],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
});
