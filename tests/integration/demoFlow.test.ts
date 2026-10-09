import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { STORY_SUGGESTIONS } from '@/components/runs/storySuggestions';
import { INTEGRATION_DATA_DIR } from './testData';

/**
 * The 5-minute demo, driven through the real UI the way a presenter would click it: a story on
 * buggy finds the bug, the same plan passes on stable, then meets the redesign. Screenshots of
 * each moment land in .data/integration/demo for a quick visual check.
 */
const baseUrl = inject('baseUrl');
const SHOTS = join(INTEGRATION_DATA_DIR, 'demo');
const FINAL = ['Passed', 'Bugs found', 'Run failed', 'Stopped'];
const firstStory = STORY_SUGGESTIONS[0]?.title ?? '';

let browser: Browser;
let page: Page;

const RUN_PAGE = /^\/runs\/[\da-f-]{36}$/;

/** Clicks a button that starts a run, waits for that new run (not the page it came from) to land. */
async function runFrom(button: string): Promise<string> {
  const from = page.url();
  await page.getByRole('button', { name: button, exact: true }).click();
  await page.waitForURL((url) => RUN_PAGE.test(url.pathname) && url.href !== from);
  const summary = page.getByRole('status', { name: 'Run summary' });
  await summary.waitFor({ timeout: 110_000 });
  const status = (await page.locator('header p[aria-live="polite"]').first().innerText()).trim();
  expect(FINAL).toContain(status);
  return (await summary.innerText()).replace(/\s+/g, ' ');
}

describe('the demo, through the UI', () => {
  beforeAll(async () => {
    await mkdir(SHOTS, { recursive: true });
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  });

  afterAll(async () => {
    await browser.close();
  });

  it('starts a suggested story on buggy and reports the bug', async () => {
    await page.goto(new URL('/runs/new', baseUrl).href);
    await page.getByRole('radio', { name: /Kota Express \(buggy\)/ }).check();
    await page.getByRole('button', { name: firstStory }).click();
    const summary = await runFrom('Start run');
    await page.screenshot({ path: join(SHOTS, '1-buggy.png') });

    expect(summary).toMatch(/1 bug found: 1 of \d+ steps failed/);
    // The browser tile opens on the evidence: the step that failed, not the last screenshot.
    expect(await page.locator('figure figcaption').first().innerText()).toMatch(/^Failed/);
    await page.getByRole('tab', { name: /Bugs/ }).click();
    await expect.poll(() => page.getByRole('tabpanel').innerText()).toContain('R 35,00');
  });

  it('proves the failure is the shop, not the plan, by passing on stable', async () => {
    const summary = await runFrom('Stable');
    await page.screenshot({ path: join(SHOTS, '2-stable.png') });

    expect(summary).toMatch(/Every check passed/);
  });

  it('meets the redesign with the same plan and lists every repair for review', async () => {
    const summary = await runFrom('Redesign');
    await page.getByRole('tab', { name: /Needs review/ }).click();
    await page.screenshot({ path: join(SHOTS, '3-redesign.png') });

    expect(summary).toMatch(/Passed after \d+ repairs/);
    expect(await page.getByRole('tabpanel').locator('li').count()).toBeGreaterThan(0);
  });

  it('runs the same plan on a phone screen', async () => {
    const summary = await runFrom('iPhone');
    await page.screenshot({ path: join(SHOTS, '4-iphone.png') });

    expect(await page.locator('header').first().innerText()).toContain('iPhone screen');
    expect(summary).toMatch(/Passed/);
  });
});
