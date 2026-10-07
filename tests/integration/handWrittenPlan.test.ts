import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { PlaywrightBrowserFactory } from '@/adapters/browser';
import { TargetUrlGuard } from '@/adapters/security';
import { FileArtifactStore } from '@/adapters/storage';
import { CryptoIdGenerator } from '@/adapters/system';
import { createDefaultActionRegistry } from '@/core/agent/actions';
import { StepFactory, type RawPlanStep } from '@/core/agent/StepFactory';
import type { Locator, PlanStep } from '@/core/domain';
import { AssertionFailedError, BrowserError } from '@/core/errors';
import type { IBrowser } from '@/core/ports';

const baseUrl = inject('baseUrl');
const DATA_DIR = resolve('.data');
const ids = new CryptoIdGenerator();
const registry = createDefaultActionRegistry();
const steps = new StepFactory(registry, ids);
const artifacts = new FileArtifactStore(DATA_DIR);

const role = (r: Locator['role'], value: string, within: Locator['within'] = null): Locator => ({
  by: 'role',
  value,
  role: r,
  exact: false,
  within,
});
const label = (value: string): Locator => ({
  by: 'label',
  value,
  role: null,
  exact: false,
  within: null,
});
const addQuarter = role('button', 'Add to order', { role: 'article', hasText: 'Quarter Kota' });

/** Add two Quarter kotas, check the cart total, check out with valid details, see the confirmation. */
function orderTwoQuarterKotas(release: string): RawPlanStep[] {
  return [
    { action: 'navigate', target: null, value: `/demo-shop/${release}`, intent: 'Open the menu' },
    { action: 'click', target: addQuarter, value: null, intent: 'Add a Quarter Kota' },
    { action: 'click', target: addQuarter, value: null, intent: 'Add another Quarter Kota' },
    { action: 'assertText', target: null, value: 'Items in your order: 2', intent: 'See 2 items' },
    { action: 'click', target: role('link', 'Cart'), value: null, intent: 'Open the cart' },
    { action: 'assertText', target: null, value: 'Total R 70,00', intent: 'Total is R 70,00' },
    { action: 'click', target: role('link', 'Checkout'), value: null, intent: 'Go to checkout' },
    { action: 'fill', target: label('Full name'), value: 'Thandi Mokoena', intent: 'Enter name' },
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
    { action: 'select', target: label('Suburb'), value: 'Soweto', intent: 'Choose Soweto' },
    {
      action: 'click',
      target: role('button', 'Place order'),
      value: null,
      intent: 'Place the order',
    },
    { action: 'assertUrl', target: null, value: '/confirmation', intent: 'Land on confirmation' },
    {
      action: 'assertVisible',
      target: role('heading', 'Order confirmed'),
      value: null,
      intent: 'See the confirmation heading',
    },
    { action: 'assertText', target: null, value: 'Delivery fee R 30,00', intent: 'Fee is R 30' },
  ];
}

type Outcome = Readonly<{ passed: PlanStep[]; failed: { step: PlanStep; error: unknown } | null }>;

async function runPlan(browser: IBrowser, runId: string, release: string): Promise<Outcome> {
  const start = new URL(`/demo-shop/${release}`, baseUrl);
  const plan = orderTwoQuarterKotas(release).map((raw) => {
    const built = steps.build(raw, start);
    if (!built.ok) throw new Error(built.warning);
    return built.step;
  });
  const session = await browser.newSession();
  const passed: PlanStep[] = [];
  try {
    for (const step of plan) {
      try {
        await registry.get(step.action).execute(step, { session, baseUrl: start });
        passed.push(step);
      } catch (error) {
        return { passed, failed: { step, error } };
      } finally {
        await artifacts.saveScreenshot(runId, step.id, await session.screenshot());
      }
    }
    return { passed, failed: null };
  } finally {
    await session.close();
  }
}

describe('a hand-written plan against Kota Express in real Chromium', () => {
  let browser: IBrowser;

  beforeAll(async () => {
    const policy = new TargetUrlGuard(
      {
        mode: 'allowlist',
        allowlist: [new URL(baseUrl).host],
        appBaseUrl: new URL(baseUrl),
        maxUrlChars: 2_048,
      },
      () => Promise.resolve([]),
    );
    browser = await new PlaywrightBrowserFactory(policy).launch({
      device: 'desktop',
      headless: true,
      slowMoMs: 0,
      stepTimeoutMs: 5_000,
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  it('passes every step on the stable release and saves a real JPEG per step', async () => {
    const runId = ids.next();
    const outcome = await runPlan(browser, runId, 'stable');

    expect(outcome.failed).toBeNull();
    expect(outcome.passed).toHaveLength(16);
    for (const step of outcome.passed) {
      const jpeg = await readFile(join(DATA_DIR, 'artifacts', runId, `${step.id}.jpg`));
      expect(jpeg.length).toBeGreaterThan(5_000);
      expect([jpeg[0], jpeg[1]]).toEqual([0xff, 0xd8]);
    }
  });

  it('fails on the buggy release at the cart total, with the real amount as evidence', async () => {
    const outcome = await runPlan(browser, ids.next(), 'buggy');

    expect(outcome.passed).toHaveLength(5);
    expect(outcome.failed?.step.intent).toBe('Total is R 70,00');
    expect(outcome.failed?.error).toBeInstanceOf(AssertionFailedError);
    expect((outcome.failed?.error as AssertionFailedError).actual).toBe(
      'the amounts shown were R 35,00',
    );
  });

  it("blocks the agent's browser from TestPilot's own API", async () => {
    const session = await browser.newSession();
    try {
      const error = await session.goto(new URL('/api/runs', baseUrl).href).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BrowserError);
      expect((error as BrowserError).failure).toBe('blocked');
      expect(session.drainFindings().map((finding) => finding.kind)).toContain('blocked-request');
    } finally {
      await session.close();
    }
  });
});
