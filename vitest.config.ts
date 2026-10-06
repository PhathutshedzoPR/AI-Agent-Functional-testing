import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// Folders held to the 80% gate (CLAUDE.md section 5). UI and wiring are covered by integration tests.
const COVERED_FOLDERS = ['src/core', 'src/adapters', 'src/server', 'src/contracts', 'src/lib'];
const GATE = { lines: 80, functions: 80, branches: 80, statements: 80 };

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
        'src/adapters/browser/Playwright*.ts',
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
          globalSetup: ['tests/integration/globalSetup.ts'],
          fileParallelism: false,
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
