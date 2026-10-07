import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, describe, expect, inject, it } from 'vitest';
import type { RunView } from '@/core/domain';
import { STORY_SUGGESTIONS } from '@/components/runs/storySuggestions';
import { createContainer } from '@/server/createContainer';
import { parseEnv } from '@/server/env';
import { createLogger } from '@/server/logger';
import { runToEnd } from './runToEnd';

/**
 * The agent scorecard: each suggestion story on every release, planned by the recorded LLM
 * responses (replay) and executed in real Chromium. Writes the table to .data/scorecard.md.
 * `npm run replays:record` runs the same file against the live model and saves its responses.
 */
const baseUrl = inject('baseUrl');
const STORY_TIMEOUT_MS = 480_000;
const LIVE_SETTINGS = [
  'LLM_PROVIDER',
  'LLM_MODEL',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
] as const;
const recording = process.env.SCORECARD_RECORD === 'true';

// Only the model comes from .env.local: every other setting stays at its default, so the
// prompts (and so the replay keys) are the same when recording and when replaying.
function llmSettings(): Record<string, string | undefined> {
  if (!recording) return { LLM_PROVIDER: 'replay' };
  process.loadEnvFile('.env.local');
  const live = Object.fromEntries(LIVE_SETTINGS.map((name) => [name, process.env[name]]));
  return { ...live, LLM_RECORD: 'true' };
}

// The seeded bug each story is written to catch (see demo-shop/_config/releases.ts), as its
// bug report words it.
const TARGET_BUG: Readonly<Record<string, RegExp>> = {
  'Order two kotas and check out': /\btotal\b/i, // cartTotalIgnoresQuantity
  'Checkout rejects a bad cellphone number': /\bcell(phone)?\b|\bphone\b/i, // cellphoneAcceptsLetters
  'The confirmation shows the delivery fee': /\bdelivery\b|\bfee\b/i, // confirmationShowsExpressFee
  'Every navigation link works': /\bspecials\b/i, // specialsPageMissing
};

// Stories whose LLM responses are in fixtures/llm-replays for all three releases. The free
// Gemini tier allows 20 calls per model per day, so stories get recorded over several days;
// add a title here once `npm run replays:record` has saved it.
const RECORDED = new Set([
  'Order two kotas and check out',
  'The confirmation shows the delivery fee',
]);
const scored = STORY_SUGGESTIONS.filter((s) => recording || RECORDED.has(s.title));
const pending = STORY_SUGGESTIONS.filter((s) => !scored.includes(s));

type Row = Readonly<{ story: string; release: string; view: RunView }>;
const rows: Row[] = [];

const { runs } = createContainer(
  parseEnv({
    APP_BASE_URL: baseUrl,
    TARGET_ALLOWLIST: new URL(baseUrl).host,
    ...llmSettings(),
  }),
  createLogger(() => undefined),
);

async function run(story: string, release: string, reusePlanFrom?: string): Promise<RunView> {
  const started = await runs.start({
    targetUrl: `${baseUrl}/demo-shop/${release}`,
    story,
    reusePlanFrom: reusePlanFrom ?? null,
  });
  return runToEnd(runs, started.id);
}

function bugText(view: RunView): string {
  return view.bugs.flatMap((bug) => [bug.title, bug.expected, bug.actual]).join('\n');
}

// The explorer visits every navigation link, so each buggy run should report the missing page.
const missingPageFound = (view: RunView): boolean =>
  view.findings.some((f) => f.kind === 'broken-link' && f.url.endsWith('/specials'));

function markdown(): string {
  const seconds = (ms: number | null): string =>
    ms === null ? '-' : `${Math.round(ms / 1_000)} s`;
  const cell = (text: string): string => text.replaceAll('|', String.raw`\|`);
  const lines = rows.map(({ story, release, view }) => {
    const bugs = view.bugs.map((bug) => cell(bug.title)).join('; ') || 'none';
    const { passed, healed, failed } = view.stats;
    return `| ${story} | ${release} | ${view.status} | ${passed} | ${healed} | ${failed} | ${bugs} | ${seconds(view.durationMs)} |`;
  });
  return [
    '| Story | Release | Result | Passed | Healed | Failed | Bugs reported | Time |',
    '|---|---|---|---|---|---|---|---|',
    ...lines,
  ].join('\n');
}

describe('agent scorecard (recorded plans, real Chromium)', () => {
  afterAll(async () => {
    await mkdir('.data', { recursive: true });
    await writeFile(join('.data', 'scorecard.md'), `${markdown()}\n`);
  });

  it.each(scored.map((s) => [s.title, s.story] as const))(
    '%s: passes on stable and redesign, fails on buggy only because of a seeded bug',
    async (title, story) => {
      const target = TARGET_BUG[title];
      expect(target, `no target bug listed for "${title}"`).toBeDefined();

      const stable = await run(story, 'stable');
      rows.push({ story: title, release: 'stable', view: stable });
      expect(stable.error).toBeNull();
      expect(stable.stats.failed).toBe(0);

      const redesign = await run(story, 'redesign', stable.runId ?? undefined);
      rows.push({ story: title, release: 'redesign (stable plan)', view: redesign });
      expect(redesign.stats.failed).toBe(0);

      const buggy = await run(story, 'buggy');
      rows.push({ story: title, release: 'buggy', view: buggy });
      expect(buggy.error).toBeNull();
      expect(bugText(buggy)).toMatch(target ?? /\b\B/);
      expect(missingPageFound(buggy)).toBe(true);

      // The releases differ only by the seeded bugs, so buggy's own plan must pass on stable:
      // anything that failed on buggy was caused by a seeded bug, not by the plan.
      const crossCheck = await run(story, 'stable', buggy.runId ?? undefined);
      expect(crossCheck.stats.failed).toBe(0);
    },
    STORY_TIMEOUT_MS,
  );

  it('heals at least once on redesign', () => {
    const redesigned = rows.filter((row) => row.release.startsWith('redesign'));
    expect(redesigned.some((row) => row.view.stats.healed > 0)).toBe(true);
  });

  for (const story of pending) {
    it.todo(`${story.title}: not recorded yet (npm run replays:record)`);
  }
});
