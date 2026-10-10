import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// Folders held to the 80% gate (CLAUDE.md section 5). UI and wiring are covered by integration tests.
const COVERED_FOLDERS = ['src/core', 'src/adapters', 'src/server', 'src/contracts', 'src/lib'];
const GATE = { lines: 80, functions: 80, branches: 80, statements: 80 };
// Integration tests share one built app and a real Chromium, so they run one file at a time.
const AGAINST_RUNNING_APP = {
  globalSetup: ['tests/integration/globalSetup.ts'],
  fileParallelism: false,
  testTimeout: 120_000,
  hookTimeout: 120_000,
};

export default defineConfig({
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      // `server-only` throws outside a React Server Component bundle, so tests get an empty module.
      'server-only': fromRoot('./tests/setup/empty-module.ts'),
    },
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: COVERED_FOLDERS.map((folder) => `${folder}/**/*.{ts,tsx}`),
      exclude: [
        '**/index.ts',
        '**/*.d.ts',
        'src/server/container.ts',
        'src/server/api.ts',
        'src/adapters/browser/Playwright*.ts',
        'src/adapters/browser/readPageTimings.ts',
      ],
      thresholds: Object.fromEntries(COVERED_FOLDERS.map((folder) => [`${folder}/**`, GATE])),
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          ...AGAINST_RUNNING_APP,
        },
      },
      {
        extends: true,
        test: {
          // npm run replays:record: the scorecard with the live model from .env.local, saving
          // every response to fixtures/llm-replays.
          name: 'record',
          include: ['tests/integration/scorecard.test.ts'],
          env: { SCORECARD_RECORD: 'true' },
          ...AGAINST_RUNNING_APP,
        },
      },
    ],
  },
});
