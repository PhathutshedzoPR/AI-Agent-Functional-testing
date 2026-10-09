import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

const require = createRequire(import.meta.url);
const NEXT_BIN = require.resolve('next/dist/bin/next');
const SERVER_READY_TIMEOUT_MS = 90_000;

/**
 * Gives integration tests a running TestPilot app. Reuses INTEGRATION_BASE_URL when set,
 * otherwise builds the app (skip with INTEGRATION_SKIP_BUILD=true) and starts it on a spare port.
 */
export default async function setup(project: TestProject): Promise<(() => void) | undefined> {
  const existing = process.env.INTEGRATION_BASE_URL;
  if (existing) {
    await waitForServer(existing);
    project.provide('baseUrl', existing);
    return undefined;
  }

  if (process.env.INTEGRATION_SKIP_BUILD !== 'true') {
    await runToCompletion(['build']);
  }
  const port = await findFreePort();
  const baseUrl = `http://localhost:${port}`;
  // Variables set here beat .env.local, so the app accepts its own spare port as origin and
  // target, and always replays: tests never call a live model.
  const server = spawn(process.execPath, [NEXT_BIN, 'start', '--port', String(port)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      APP_BASE_URL: baseUrl,
      TARGET_MODE: 'allowlist',
      TARGET_ALLOWLIST: `localhost:${port}`,
      LLM_PROVIDER: 'replay',
      LLM_RECORD: 'false',
      // The suites start more runs a minute than a person would; the limiter has its own tests.
      RATE_LIMIT_RUNS_PER_MINUTE: '1000',
    },
  });
  await waitForServer(baseUrl, server);
  project.provide('baseUrl', baseUrl);
  return () => {
    server.kill();
  };
}

function runToCompletion(args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [NEXT_BIN, ...args], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`next ${args.join(' ')} exited with code ${String(code)}`));
    });
  });
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(baseUrl: string, child?: ChildProcess): Promise<void> {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child?.exitCode != null) {
      throw new Error(`The app server exited early with code ${String(child.exitCode)}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.status < 500) return;
    } catch {
      // Not listening yet; keep polling until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No app answered at ${baseUrl} within ${SERVER_READY_TIMEOUT_MS} ms`);
}
