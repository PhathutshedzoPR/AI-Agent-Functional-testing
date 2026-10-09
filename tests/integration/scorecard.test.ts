import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, describe, expect, inject, it } from 'vitest';
import type { RunView } from '@/core/domain';
import { STORY_SUGGESTIONS } from '@/components/runs/storySuggestions';
import { createContainer } from '@/server/createContainer';
import { parseEnv } from '@/server/env';
import { createLogger } from '@/server/logger';
import { runToEnd } from './runToEnd';
import { INTEGRATION_DATA_DIR } from './testData';

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
  if (!process.env.LLM_PROVIDER || process.env.LLM_PROVIDER === 'replay') {
    throw new Error(
      'npm run replays:record calls a live model. In .env.local set LLM_PROVIDER to google, anthropic or openai, with LLM_MODEL and that provider key, then run it again. Set it back to replay afterwards.',
    );
  }
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

type Row = Readonly<{ story: string; release: string; view: RunView }>;
const rows: Row[] = [];

const { runs } = createContainer(
  parseEnv({
    APP_BASE_URL: baseUrl,
    TARGET_ALLOWLIST: new URL(baseUrl).host,
    DATA_DIR: INTEGRATION_DATA_DIR,
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

// Expecting this to be empty (rather than a failed count of 0) makes a CI log name the step and
// its error, so a failure on the runner can be read without its run files.
function failedSteps(view: RunView): string[] {
  return view.scenarios.flatMap((scenario) =>
    scenario.steps
      .filter((step) => step.state === 'failed')
      .map((step) => `${scenario.title} / ${step.intent}: ${step.result?.error ?? 'no error'}`),
  );
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

  // Every suggestion story is recorded for every release; a new one needs npm run replays:record.
  it.each(STORY_SUGGESTIONS.map((s) => [s.title, s.story] as const))(
    '%s: passes on stable and redesign (old plan or fresh), fails on buggy only by a seeded bug',
    async (title, story) => {
      const target = TARGET_BUG[title];
      expect(target, `no target bug listed for "${title}"`).toBeDefined();

      const stable = await run(story, 'stable');
      rows.push({ story: title, release: 'stable', view: stable });
      expect(stable.error).toBeNull();
      expect(failedSteps(stable)).toEqual([]);

      const redesign = await run(story, 'redesign', stable.runId ?? undefined);
      rows.push({ story: title, release: 'redesign (stable plan)', view: redesign });
      expect(failedSteps(redesign)).toEqual([]);

      // Planned afresh on the redesign, the agent reads the new names itself: nothing to heal.
      const planned = await run(story, 'redesign');
      rows.push({ story: title, release: 'redesign (planned fresh)', view: planned });
      expect(planned.error).toBeNull();
      expect(failedSteps(planned)).toEqual([]);

      const buggy = await run(story, 'buggy');
      rows.push({ story: title, release: 'buggy', view: buggy });
      expect(buggy.error).toBeNull();
      expect(bugText(buggy)).toMatch(target ?? /\b\B/);
      expect(missingPageFound(buggy)).toBe(true);

      // The releases differ only by the seeded bugs, so buggy's own plan must pass on stable:
      // anything that failed on buggy was caused by a seeded bug, not by the plan.
      const crossCheck = await run(story, 'stable', buggy.runId ?? undefined);
      expect(failedSteps(crossCheck)).toEqual([]);
    },
    STORY_TIMEOUT_MS,
  );

  it('heals at least once when an old plan meets the redesign', () => {
    const redesigned = rows.filter((row) => row.release === 'redesign (stable plan)');
    expect(redesigned.some((row) => row.view.stats.healed > 0)).toBe(true);
  });
});
