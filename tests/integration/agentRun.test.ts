import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import type { LlmRequest } from '@/core/ports';
import type { PlanOutput } from '@/core/prompts';
import { createContainer } from '@/server/createContainer';
import { parseEnv } from '@/server/env';
import { createLogger } from '@/server/logger';
import { FakeLanguageModel } from '../fakes/FakeLanguageModel';
import { runToEnd } from './runToEnd';

const baseUrl = inject('baseUrl');
const require = createRequire(import.meta.url);

type Step = PlanOutput['scenarios'][number]['steps'][number];
const role = (r: 'button' | 'link' | 'heading', value: string, hasText?: string) => ({
  by: 'role' as const,
  value,
  role: r,
  exact: false,
  within: hasText ? { role: 'article' as const, hasText } : null,
});
const label = (value: string) => ({
  by: 'label' as const,
  value,
  role: null,
  exact: false,
  within: null,
});

/** The plan a model would propose for "order two kotas", written for the start page it is shown. */
function orderPlan(start: string): PlanOutput {
  const steps: Step[] = [
    { action: 'navigate', target: null, value: start, intent: 'Open the menu' },
    {
      action: 'click',
      target: role('button', 'Add to order', 'Quarter Kota'),
      value: null,
      intent: 'Add a Quarter Kota',
    },
    {
      action: 'click',
      target: role('button', 'Add to order', 'Quarter Kota'),
      value: null,
      intent: 'Add another',
    },
    { action: 'click', target: role('link', 'Cart'), value: null, intent: 'Open the cart' },
    { action: 'assertText', target: null, value: 'Total R 70,00', intent: 'Total is R 70,00' },
    { action: 'click', target: role('link', 'Checkout'), value: null, intent: 'Go to checkout' },
    { action: 'fill', target: label('Full name'), value: 'Thandi Mokoena', intent: 'Name' },
    { action: 'fill', target: label('Cellphone number'), value: '082 123 4567', intent: 'Phone' },
    {
      action: 'fill',
      target: label('Email address'),
      value: 'thandi@example.co.za',
      intent: 'Email',
    },
    {
      action: 'fill',
      target: label('Street address'),
      value: '12 Vilakazi Street',
      intent: 'Street',
    },
    { action: 'select', target: label('Suburb'), value: 'Soweto', intent: 'Suburb' },
    {
      action: 'click',
      target: role('button', 'Place order'),
      value: null,
      intent: 'Place the order',
    },
    {
      action: 'assertVisible',
      target: role('heading', 'Order confirmed'),
      value: null,
      intent: 'Confirmed',
    },
  ];
  return {
    summary: 'Orders two kotas and checks out',
    criteria: ['The total is right', 'Checkout confirms the order'],
    scenarios: [
      {
        title: 'Order two kotas',
        kind: 'happy',
        criterion: 'The total is right',
        priority: 'high',
        steps,
      },
    ],
  };
}

/** What a model would suggest for the redesign's renamed controls that no rule can match. */
const RENAMED: Readonly<Record<string, ReturnType<typeof role>>> = {
  Checkout: role('link', 'Proceed to payment'),
  'Place order': role('button', 'Confirm order'),
};

function healFor(request: LlmRequest<never>) {
  const broken = /"value":"([^"]+)"/.exec(request.prompt)?.[1] ?? '';
  const locator = RENAMED[broken];
  return locator
    ? { locator, confidence: 0.9, reason: `"${broken}" is now "${locator.value}".` }
    : { locator: role('button', broken), confidence: 0.1, reason: 'No idea.' };
}

const startPathOf = (request: LlmRequest<never>): string =>
  /^Start page: (\S+)$/m.exec(request.prompt)?.[1] ?? '/';

function app() {
  const host = new URL(baseUrl).host;
  const env = parseEnv({
    APP_BASE_URL: baseUrl,
    TARGET_ALLOWLIST: host,
    LLM_PROVIDER: 'replay',
    AGENT_MAX_SCENARIOS: '2',
    AGENT_MAX_STEPS: '14',
    AGENT_STEP_TIMEOUT_MS: '5000',
  });
  const llm = new FakeLanguageModel()
    .answer('plan', (request: LlmRequest<never>) => orderPlan(startPathOf(request)))
    .answer('heal', healFor);
  return createContainer(
    env,
    createLogger(() => undefined),
    { llm },
  );
}

const { runs } = app();

/** Writes a run's exported spec next to a minimal config and runs it, the way a team would. */
async function runExportedSpec(runId: string): Promise<SpawnSyncReturns<string>> {
  const spec = await runs.export(runId, 'spec');
  const dir = resolve('.data', 'export-check', runId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'order.spec.ts'), spec.body);
  await writeFile(
    join(dir, 'playwright.config.mjs'),
    "export default { testDir: '.', reporter: 'line', workers: 1, use: { headless: true } };",
  );
  const cli = require.resolve('@playwright/test/cli');
  return spawnSync(
    process.execPath,
    [cli, 'test', '--config', join(dir, 'playwright.config.mjs')],
    {
      encoding: 'utf8',
      timeout: 120_000,
    },
  );
}

describe('the agent end to end: real app, real Chromium, scripted plan', () => {
  it('passes on stable, with a real screenshot behind every step', async () => {
    const run = await runs.start({
      targetUrl: `${baseUrl}/demo-shop/stable`,
      story: 'Order two kotas',
    });
    const view = await runToEnd(runs, run.id);

    expect(view.status).toBe('passed');
    expect(view.pages.map((page) => new URL(page.url).pathname)).toEqual([
      '/demo-shop/stable',
      '/demo-shop/stable/specials',
      '/demo-shop/stable/cart',
      '/demo-shop/stable/checkout',
    ]);
    expect(view.stats).toMatchObject({ passed: 13, failed: 0, bugs: 0 });
    const lastStep = view.scenarios[0]?.steps.at(-1);
    const jpeg = await readFile(join('.data', 'artifacts', run.id, `${lastStep?.id}.jpg`));
    expect([jpeg[0], jpeg[1]]).toEqual([0xff, 0xd8]);
  });

  it('finds the cart-total bug and the broken Specials link on buggy', async () => {
    const run = await runs.start({
      targetUrl: `${baseUrl}/demo-shop/buggy`,
      story: 'Order two kotas',
    });
    const view = await runToEnd(runs, run.id);

    expect(view.status).toBe('failed');
    expect(view.bugs).toHaveLength(1);
    expect(view.bugs[0]).toMatchObject({
      expected: 'The page to contain "Total R 70,00"',
      actual: 'The amounts shown were R 35,00',
      severity: 'high',
    });
    expect(view.findings.filter((f) => f.kind === 'broken-link').map((f) => f.status)).toEqual([
      404,
    ]);
  });

  it('re-runs the stable plan on redesign and passes by healing the renamed controls', async () => {
    const stable = await runs.start({ targetUrl: `${baseUrl}/demo-shop/stable` });
    await runToEnd(runs, stable.id);

    const rerun = await runs.start({
      targetUrl: `${baseUrl}/demo-shop/redesign`,
      reusePlanFrom: stable.id,
    });
    const view = await runToEnd(runs, rerun.id);

    const healings = view.scenarios
      .flatMap((s) => s.steps)
      .flatMap((step) => step.result?.healing ?? []);
    expect(view.pages).toEqual([]);
    expect(view.status).toBe('passed');
    expect(view.stats).toMatchObject({ failed: 0, healed: 4, bugs: 0 });
    expect(healings.map((h) => [h.method, h.to.value])).toEqual([
      ['rule', 'Add to bag'],
      ['rule', 'Add to bag'],
      ['llm', 'Proceed to payment'],
      ['llm', 'Confirm order'],
    ]);
    expect(healings[0]?.reason).toContain('on a page the explorer never saw');
  });

  it('exports a Playwright spec that passes when the team runs it', async () => {
    const run = await runs.start({ targetUrl: `${baseUrl}/demo-shop/stable` });
    await runToEnd(runs, run.id);
    const result = await runExportedSpec(run.id);

    expect(result.stdout).toContain('1 passed');
    expect(result.status).toBe(0);
  });

  it('runs the stable plan on an Android screen, and its spec passes on that screen too', async () => {
    const stable = await runs.start({ targetUrl: `${baseUrl}/demo-shop/stable` });
    await runToEnd(runs, stable.id);
    const phone = await runs.start({
      targetUrl: `${baseUrl}/demo-shop/stable`,
      reusePlanFrom: stable.id,
      device: 'android',
    });
    const view = await runToEnd(runs, phone.id);
    const firstStep = view.scenarios[0]?.steps[0];
    const jpeg = await readFile(join('.data', 'artifacts', phone.id, `${firstStep?.id}.jpg`));

    expect(view).toMatchObject({ device: 'android', status: 'passed' });
    expect(view.stats.failed).toBe(0);
    // JPEG width sits in the SOF0 frame header: the screenshot is the phone's 412 CSS pixels wide.
    const sof = jpeg.indexOf(Buffer.from([0xff, 0xc0]));
    expect(jpeg.readUInt16BE(sof + 7)).toBe(412);

    const result = await runExportedSpec(phone.id);
    expect(result.stdout).toContain('1 passed');
    expect(result.status).toBe(0);
  });
});
