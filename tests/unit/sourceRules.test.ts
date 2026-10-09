import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Rules from CLAUDE.md sections 4 and 5 that a pattern can check, run against every source file,
 * so a slip fails the build instead of waiting for a review.
 */
const SOURCE_FILE = /\.(ts|tsx|mts)$/;
const files = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((path) => SOURCE_FILE.test(path))
  .map((path) => join('src', path));

// Each rule: what it protects, the pattern, and a line it must catch (so no rule passes vacuously).
const RULES: ReadonlyArray<readonly [string, RegExp, string]> = [
  [
    'no raw HTML into React (s4, 8)',
    /dangerouslySetInnerHTML/,
    '<p dangerouslySetInnerHTML={x} />',
  ],
  ['no eval or new Function on any string (s4, 4)', /\beval\s*\(|new Function\s*\(/, 'eval(plan)'],
  ['ids from crypto.randomUUID, never Math.random (s4, 11)', /Math\.random\s*\(/, 'Math.random()'],
  [
    'SHA-256 for hashes, never MD5 or SHA-1 (s4, 11)',
    /createHash\(\s*['"](md5|sha1)['"]/i,
    "createHash('sha1')",
  ],
  ['no secrets exposed to the browser (s4, 1)', /NEXT_PUBLIC_/, 'process.env.NEXT_PUBLIC_KEY'],
  ['logs go through the logger (s5, 5)', /console\.log\s*\(/, 'console.log(run)'],
  [
    'no http:// literals; base URLs come from env (s5, 7)',
    /['"`]http:\/\//,
    "const base = 'http://x';",
  ],
  [
    'no silenced rules (s5, 12)',
    /eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck|NOSONAR/,
    '// @ts-ignore',
  ],
];

describe('source rules', () => {
  it('finds the source files', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(RULES)('%s', (_rule, pattern, example) => {
    expect(pattern.test(example)).toBe(true);
    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) => (pattern.test(line) ? [`${file}:${index + 1}`] : [])),
    );

    expect(offenders).toEqual([]);
  });
});
