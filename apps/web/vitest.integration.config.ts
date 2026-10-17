import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': fileURLToPath(new URL('./tests/integration/server-only.ts', import.meta.url)) },
  },
  test: { environment: 'node', include: ['tests/integration/**/*.test.ts'], fileParallelism: false },
});
