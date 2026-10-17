import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const web = join(root, 'apps/web');
// Preserve shell-provided values and never log credentials.
for (const name of ['.env', 'apps/web/.env.local'])
  try {
    for (const line of (await readFile(join(root, name), 'utf8')).split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined)
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* Environment may be supplied by CI. */
  }
for (const name of ['SUPABASE_DB_URL', 'NEXT_PUBLIC_SUPABASE_URL'])
  if (
    !process.env[name] ||
    !['localhost', '127.0.0.1'].includes(new URL(process.env[name]).hostname)
  )
    throw new Error('All-phase verification requires the local Supabase stack');
if (!process.env.CAREERSIGNAL_TEST_DATABASE_URL)
  throw new Error(
    'Set CAREERSIGNAL_TEST_DATABASE_URL to the disposable Postgres database on port 55439',
  );
const output = join(root, 'tmp/codex-careersignal-checks');
await mkdir(output, { recursive: true });
const report = {
  startedAt: new Date().toISOString(),
  scope:
    'Four candidate product phases; local stack and mocked Google provider',
  liveGoogleAccountVerified: false,
  liveAIProviderVerified: false,
  checks: [],
};
let failed = false,
  server,
  aiServer;
const node = process.execPath;
const env = {
  ...process.env,
  PATH: [resolve(node, '..'), process.env.PATH].join(':'),
  PYTHONPATH: join(root, 'services/ai'),
  E2E_BASE_URL: 'http://localhost:3089',
  RESEND_API_KEY: '',
};
async function run(name, command, args, cwd = root) {
  const start = Date.now();
  let log = '';
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => {
    log += chunk;
  });
  child.stderr.on('data', (chunk) => {
    log += chunk;
  });
  const exitCode = await new Promise((resolve) => {
    child.on('error', () => resolve(-1));
    child.on('close', resolve);
  });
  await writeFile(join(output, name + '.log'), log);
  report.checks.push({
    name,
    status: exitCode === 0 ? 'passed' : 'failed',
    exitCode,
    durationMs: Date.now() - start,
    log: name + '.log',
  });
  console.log(`${name}: ${exitCode === 0 ? 'passed' : 'FAILED'}`);
  if (exitCode !== 0) failed = true;
}
try {
  await run('shared-types', node, [
    'node_modules/typescript/bin/tsc',
    '-p',
    'packages/shared',
  ]);
  await run('database-types', node, [
    'node_modules/typescript/bin/tsc',
    '-p',
    'packages/db',
  ]);
  await run('unit-tests', node, ['node_modules/vitest/vitest.mjs', 'run'], web);
  await run(
    'postgres-integration',
    node,
    [
      'node_modules/vitest/vitest.mjs',
      'run',
      '--config',
      'vitest.integration.config.ts',
    ],
    web,
  );
  await run('backend-tests', process.env.CAREERSIGNAL_PYTHON || 'python3', [
    '-m',
    'unittest',
    'discover',
    '-s',
    'services/ai/tests',
    '-v',
  ]);
  await run('migration-replay', node, ['scripts/verify-career-migration.mjs']);
  await run('database-security', node, ['scripts/audit-career-security.mjs']);
  await run('lint', node, ['node_modules/eslint/bin/eslint.js', '.'], web);
  await run(
    'typescript',
    node,
    ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'],
    web,
  );
  await run(
    'production-build',
    node,
    ['node_modules/next/dist/bin/next', 'build'],
    web,
  );
  await run('extension-syntax', node, [
    '--check',
    'extensions/job-capture/popup.js',
  ]);
  await run('compose-config', process.env.CAREERSIGNAL_DOCKER || 'docker', [
    'compose',
    '-f',
    'docker-compose.prod.yml',
    'config',
    '--quiet',
  ]);
  await run(
    'compose-development-config',
    process.env.CAREERSIGNAL_DOCKER || 'docker',
    ['compose', 'config', '--quiet'],
  );
  await run(
    'compose-production-local-config',
    process.env.CAREERSIGNAL_DOCKER || 'docker',
    [
      'compose',
      '-f',
      'docker-compose.prod.yml',
      '-f',
      'docker-compose.override.yml',
      'config',
      '--quiet',
    ],
  );
  if (!failed) {
    // Never reuse an unrelated process on the test port.
    let occupied = false;
    try {
      await fetch('http://localhost:3089/api/health', {
        signal: AbortSignal.timeout(1000),
      });
      occupied = true;
    } catch {
      /* Port free. */
    }
    if (occupied)
      throw new Error(
        'Stop the existing web server on port 3089 before running the automated check',
      );
    try {
      await fetch('http://127.0.0.1:8011/health', {
        signal: AbortSignal.timeout(1000),
      });
      throw new Error('ai-port-occupied');
    } catch (error) {
      if (error instanceof Error && error.message === 'ai-port-occupied')
        throw new Error(
          'Stop the existing AI server on port 8011 before verification',
        );
    }
    const internalToken = randomUUID();
    aiServer = spawn(
      process.env.CAREERSIGNAL_PYTHON || 'python3',
      [
        '-m',
        'uvicorn',
        'app.main:app',
        '--host',
        '127.0.0.1',
        '--port',
        '8011',
      ],
      {
        cwd: join(root, 'services/ai'),
        env: { ...env, OPENAI_API_KEY: '', INTERNAL_API_TOKEN: internalToken },
        stdio: 'ignore',
      },
    );
    let aiReady = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        if (
          (
            await fetch('http://127.0.0.1:8011/health', {
              signal: AbortSignal.timeout(1000),
            })
          ).ok
        ) {
          aiReady = true;
          break;
        }
      } catch {
        /* Starting. */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!aiReady)
      throw new Error('Deterministic AI service did not become ready');
    server = spawn(
      node,
      ['node_modules/next/dist/bin/next', 'start', '--port', '3089'],
      {
        cwd: web,
        env: {
          ...env,
          AI_SERVICE_URL: 'http://127.0.0.1:8011',
          AI_INTERNAL_TOKEN: internalToken,
        },
        stdio: 'ignore',
      },
    );
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await fetch('http://localhost:3089/api/health', {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Starting. */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error('Test web server did not become ready');
    await run(
      'desktop-mobile-workflows',
      node,
      [
        'node_modules/@playwright/test/cli.js',
        'test',
        '--config',
        'playwright.workflow.config.ts',
      ],
      web,
    );
  }
} catch (error) {
  failed = true;
  report.error = error instanceof Error ? error.message : 'Verification failed';
} finally {
  if (aiServer) aiServer.kill('SIGTERM');
  if (server) {
    server.kill('SIGTERM');
    await new Promise((resolve) => {
      server.once('close', resolve);
      setTimeout(resolve, 5000);
    });
  }
  report.finishedAt = new Date().toISOString();
  report.status = failed ? 'failed' : 'passed';
  await writeFile(
    join(output, 'report.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(`Report: ${join(output, 'report.json')}`);
  process.exitCode = failed ? 1 : 0;
}
