import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.{ts,tsx,mts,cts}'];

const FRAMEWORK_IMPORTS = {
  group: ['next', 'next/*', 'react', 'react/*', 'react-dom', 'react-dom/*'],
  message: 'src/core is plain TypeScript: no framework imports (CLAUDE.md section 3).',
};
const INFRA_IMPORTS = {
  group: ['playwright', 'playwright/*', 'ai', 'ai/*', '@ai-sdk/*', 'node:*', 'server-only'],
  message: 'Infrastructure belongs in src/adapters behind a port (CLAUDE.md section 3).',
};
const OUTER_LAYERS = {
  group: [
    '@/adapters',
    '@/adapters/*',
    '@/server',
    '@/server/*',
    '@/app',
    '@/app/*',
    '@/components',
    '@/components/*',
    '@/hooks',
    '@/hooks/*',
    '**/adapters/**',
    '**/server/**',
    '**/components/**',
    '**/hooks/**',
  ],
  message: 'Dependencies point inward: core must not import outer layers.',
};
const SERVER_SIDE = {
  group: [
    '@/server',
    '@/server/*',
    '@/adapters',
    '@/adapters/*',
    'playwright',
    'playwright/*',
    'ai',
    'ai/*',
    '@ai-sdk/*',
    'node:*',
  ],
  message: 'Client code must not import server-side modules.',
};
const CORE_EXCEPT_DOMAIN = {
  group: ['@/core/*', '!@/core/domain', '!@/core/domain/*'],
  message: 'UI code may import only src/core/domain (types and projectRun) and src/contracts.',
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  sonarjs.configs.recommended,
  {
    files: TS_FILES,
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Explicit return types on the public surface of non-UI modules (CLAUDE.md section 5).
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'no-console': 'error',
    },
  },
  {
    files: ['src/**/*.tsx'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['src/core/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [FRAMEWORK_IMPORTS, INFRA_IMPORTS, OUTER_LAYERS] },
      ],
    },
  },
  {
    files: ['src/components/**', 'src/hooks/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [SERVER_SIDE, CORE_EXCEPT_DOMAIN] },
      ],
    },
  },
  {
    files: ['src/adapters/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/server',
                '@/server/*',
                '@/app',
                '@/app/*',
                '@/components',
                '@/components/*',
                '@/hooks',
                '@/hooks/*',
              ],
              message: 'Adapters implement core ports and must not import outer layers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/adapters', '@/adapters/*'],
              message: 'Pages and routes reach adapters through src/server/container.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    '.data/**',
    'reports/**',
    'test-results/**',
  ]),
]);
