import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, inject, it, vi } from 'vitest';
import { TestRun, projectRun, type RunView } from '@/core/domain';
import type { LlmRequest } from '@/core/ports';
import type { PlanOutput } from '@/core/prompts';
import { createContainer } from '@/server/createContainer';
import { parseEnv } from '@/server/env';
import { createLogger } from '@/server/logger';
import { FakeLanguageModel } from '../fakes/FakeLanguageModel';

const baseUrl = inject('baseUrl');

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
  const llm = new FakeLanguageModel().answer('plan', (request: LlmRequest<never>) =>
    orderPlan(startPathOf(request)),
  );
  return createContainer(
    env,
    createLogger(() => undefined),
    { llm },
  );
}

async function runToEnd(runs: ReturnType<typeof app>['runs'], runId: string): Promise<RunView> {
  await vi.waitFor(
    async () => {
      const { run } = await runs.get(runId);
      if (!TestRun.isFinal(run.status)) throw new Error('still running');
    },
    { timeout: 110_000, interval: 250 },
  );
  return projectRun((await runs.get(runId)).events);
}

describe('the agent end to end: real app, real Chromium, scripted plan', () => {
  const { runs } = app();

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
      actual: 'The amounts shown were R 35,00',
      severity: 'high',
    });
    expect(view.findings.filter((f) => f.kind === 'broken-link').map((f) => f.status)).toEqual([
      404,
    ]);
  });

  it('re-runs the stable plan on redesign and stops at the renamed button (until healing lands)', async () => {
    const stable = await runs.start({ targetUrl: `${baseUrl}/demo-shop/stable` });
    await runToEnd(runs, stable.id);

    const rerun = await runs.start({
      targetUrl: `${baseUrl}/demo-shop/redesign`,
      reusePlanFrom: stable.id,
    });
    const view = await runToEnd(runs, rerun.id);

    expect(view.pages).toEqual([]);
    expect(view.status).toBe('failed');
    expect(view.scenarios[0]?.steps[1]?.result?.error).toContain(
      'No visible button "Add to order"',
    );
  });
});
