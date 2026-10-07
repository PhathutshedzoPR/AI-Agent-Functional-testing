import { AxeBuilder } from '@axe-core/playwright';
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { RunResponseSchema, RunSnapshotResponseSchema, runApiPaths } from '@/contracts';
import { TestRun } from '@/core/domain';
import { STORY_SUGGESTIONS } from '@/components/runs/storySuggestions';

/**
 * TestPilot's own pages checked with axe-core (the engine behind Lighthouse's accessibility
 * score) against WCAG 2.1 A and AA plus best practices, on a laptop and a 360px phone.
 */
const baseUrl = inject('baseUrl');
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const VIEWPORTS = { laptop: { width: 1280, height: 800 }, phone: { width: 360, height: 740 } };

let browser: Browser;
let runPath = '';

async function finishedRun(): Promise<string> {
  const story = STORY_SUGGESTIONS[0]?.story ?? null;
  const response = await fetch(new URL(runApiPaths.runs, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: baseUrl },
    body: JSON.stringify({ targetUrl: `${baseUrl}/demo-shop/buggy`, story }),
  });
  const { run } = RunResponseSchema.parse(await response.json());
  await vi.waitFor(
    async () => {
      const snapshot = await fetch(new URL(runApiPaths.run(run.id), baseUrl));
      const { run: current } = RunSnapshotResponseSchema.parse(await snapshot.json());
      if (!TestRun.isFinal(current.status)) throw new Error('still running');
    },
    { timeout: 110_000, interval: 500 },
  );
  return `/runs/${run.id}`;
}

async function violations(path: string, viewport: keyof typeof VIEWPORTS): Promise<string[]> {
  const context = await browser.newContext({ viewport: VIEWPORTS[viewport] });
  try {
    const page = await context.newPage();
    await page.goto(new URL(path, baseUrl).href, { waitUntil: 'networkidle' });
    const result = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    return result.violations.map((v) => `${v.id} (${v.impact ?? 'unknown'}): ${v.help}`);
  } finally {
    await context.close();
  }
}

describe('accessibility of TestPilot pages (axe-core, WCAG 2.1 AA)', () => {
  beforeAll(async () => {
    browser = await chromium.launch();
    runPath = await finishedRun();
  }, 120_000);

  afterAll(async () => {
    await browser.close();
  });

  it.each([
    ['landing', '/'],
    ['new run', '/runs/new'],
    ['history', '/runs'],
    ['a finished run with a bug', 'run'],
    ['a page that does not exist', '/no-such-page'],
    ['a run the server no longer has', '/runs/00000000-0000-4000-8000-00000000dead'],
  ])('%s has no violations on a laptop or a phone', async (_name, path) => {
    const target = path === 'run' ? runPath : path;

    expect(await violations(target, 'laptop')).toEqual([]);
    expect(await violations(target, 'phone')).toEqual([]);
  });
});
