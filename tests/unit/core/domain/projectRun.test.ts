import { describe, expect, it } from 'vitest';
import {
  EMPTY_RUN_VIEW,
  RunEventSchema,
  applyRunEvent,
  narrateEvent,
  projectRun,
  type RunEventPayload,
} from '@/core/domain';
import {
  RUN_ID,
  aBug,
  aPlan,
  aRoleLocator,
  aScenario,
  aStep,
  aStepResult,
} from '../../../fakes/domainBuilders';
import { stamp } from '../../../fakes/eventBuilders';

const plan = aPlan({
  summary: 'Order flow',
  scenarios: [
    aScenario({
      id: 'sc1',
      title: 'Order two',
      steps: [aStep({ id: 'a' }), aStep({ id: 'b' }), aStep({ id: 'c' })],
    }),
    aScenario({ id: 'sc2', title: 'Bad phone', kind: 'negative', steps: [aStep({ id: 'd' })] }),
  ],
});
const healing = {
  from: aRoleLocator('button', 'Add to order'),
  to: aRoleLocator('button', 'Add to bag'),
  method: 'rule' as const,
  strategy: 'similar-name',
  reason: 'Renamed',
};

const started: RunEventPayload = {
  type: 'run.started',
  targetUrl: 'http://localhost:3000/demo-shop/buggy',
  targetLabel: 'Kota Express (buggy)',
  device: 'desktop',
  story: 'Order two kotas',
  replayed: true,
  limits: { maxPages: 5, maxScenarios: 4, maxSteps: 12, maxLlmCalls: 12 },
};

const fullRun: RunEventPayload[] = [
  started,
  { type: 'explore.page', url: 'http://localhost:3000/demo-shop/buggy/cart', title: 'Cart' },
  { type: 'llm.called', purpose: 'plan', used: 1, max: 12 },
  {
    type: 'plan.ready',
    plan,
    warnings: ['Dropped one'],
    criteria: ['Total is right'],
    criteriaInferred: true,
  },
  { type: 'scenario.started', scenarioId: 'sc1' },
  { type: 'step.started', scenarioId: 'sc1', stepId: 'a' },
  { type: 'step.finished', result: aStepResult({ scenarioId: 'sc1', stepId: 'a' }) },
  { type: 'step.started', scenarioId: 'sc1', stepId: 'b' },
  {
    type: 'step.finished',
    result: aStepResult({ scenarioId: 'sc1', stepId: 'b', status: 'healed', healing }),
  },
  { type: 'step.started', scenarioId: 'sc1', stepId: 'c' },
  {
    type: 'step.finished',
    result: aStepResult({
      scenarioId: 'sc1',
      stepId: 'c',
      status: 'failed',
      error: 'Expected R 70',
    }),
  },
  {
    type: 'finding',
    finding: {
      id: 'f1',
      kind: 'http-error',
      message: 'GET /x returned 404',
      url: '/x',
      status: 404,
      scenarioId: 'sc1',
      stepId: 'c',
    },
  },
  { type: 'scenario.finished', scenarioId: 'sc1', status: 'failed' },
  { type: 'scenario.started', scenarioId: 'sc2' },
  {
    type: 'step.finished',
    result: aStepResult({
      scenarioId: 'sc2',
      stepId: 'd',
      status: 'skipped',
      screenshot: false,
      durationMs: 0,
      url: null,
    }),
  },
  { type: 'scenario.finished', scenarioId: 'sc2', status: 'passed' },
  { type: 'bug.reported', bug: aBug({ scenarioId: 'sc1', title: 'Cart total ignores quantity' }) },
  { type: 'run.finished', status: 'failed', durationMs: 21_000 },
];

describe('projectRun', () => {
  const view = projectRun(stamp(fullRun));

  it('starts empty and queued', () => {
    expect(projectRun([])).toBe(EMPTY_RUN_VIEW);
    expect(EMPTY_RUN_VIEW.status).toBe('queued');
  });

  it('fills in the run header from run.started and run.finished', () => {
    expect(view).toMatchObject({
      runId: RUN_ID,
      status: 'failed',
      targetLabel: 'Kota Express (buggy)',
      story: 'Order two kotas',
      replayed: true,
      startedAt: '2026-10-06T08:00:00.000Z',
      finishedAt: '2026-10-06T08:00:17.000Z',
      durationMs: 21_000,
      llmCallsUsed: 1,
      activeStepId: null,
    });
    expect(view.limits?.maxLlmCalls).toBe(12);
  });

  it('keeps the screen the run used, reading older runs as desktop', () => {
    const [phone] = stamp([{ ...started, device: 'iphone' }]);
    // Shaped like the landing page's recorded run, from before runs had a device.
    const old = RunEventSchema.parse({
      type: 'run.started',
      runId: RUN_ID,
      seq: 1,
      at: '2026-10-06T08:00:00.000Z',
      targetUrl: 'http://localhost:3000/demo-shop/stable',
      targetLabel: 'Kota Express (stable)',
      story: null,
      replayed: true,
      limits: { maxPages: 5, maxScenarios: 4, maxSteps: 12, maxLlmCalls: 12 },
    });

    expect(phone && projectRun([phone]).device).toBe('iphone');
    expect(projectRun([old]).device).toBe('desktop');
  });

  it('lays out every planned step and its result', () => {
    const [first, second] = view.scenarios;

    expect(view.summary).toBe('Order flow');
    expect(view.warnings).toEqual(['Dropped one']);
    expect(view.criteriaInferred).toBe(true);
    expect(view.criteria).toEqual(['Total is right']);
    expect(first?.state).toBe('failed');
    expect(first?.steps.map((s) => s.state)).toEqual(['passed', 'healed', 'failed']);
    expect(first?.steps[1]?.result?.healing).toEqual(healing);
    expect(second?.state).toBe('passed');
    expect(second?.steps[0]?.state).toBe('skipped');
  });

  it('counts results, bugs, pages and findings', () => {
    expect(view.stats).toEqual({ passed: 1, healed: 1, failed: 1, skipped: 1, bugs: 1 });
    expect(view.pages).toEqual([
      { url: 'http://localhost:3000/demo-shop/buggy/cart', title: 'Cart' },
    ]);
    expect(view.findings).toHaveLength(1);
    expect(view.bugs[0]?.title).toBe('Cart total ignores quantity');
  });

  it('tracks the step in progress', () => {
    const midway = projectRun(stamp(fullRun.slice(0, 8)));

    expect(midway.activeStepId).toBe('b');
    expect(midway.status).toBe('running');
    expect(midway.scenarios[0]?.steps[1]?.state).toBe('running');
    expect(midway.scenarios[1]?.state).toBe('pending');
  });

  it('narrates the run in the feed with real numbers only', () => {
    expect(view.feed.map((line) => line.text)).toEqual([
      'Heading to Kota Express (buggy).',
      'Read /demo-shop/buggy/cart.',
      'Planned 2 scenarios with warnings to read.',
      'Flying "Order two".',
      'Couldn\'t find button "Add to order", used button "Add to bag" instead. Needs review.',
      'A check failed: Expected R 70',
      'Flying "Bad phone".',
      'Bug: Cart total ignores quantity.',
      'Landed with 1 bug to look at.',
    ]);
    expect(view.feed.map((line) => line.tone)).toContain('warn');
  });

  it('ignores duplicates and replays, and sorts out-of-order input', () => {
    const events = stamp(fullRun);
    const replayed = projectRun([...events].reverse());
    const twice = events.reduce((acc, event) => applyRunEvent(acc, event), view);

    expect(replayed).toEqual(view);
    expect(twice).toBe(view);
  });

  it('ends a run on failure or cancellation', () => {
    const failed = projectRun(
      stamp([
        started,
        { type: 'run.failed', error: { code: 'LLM_FAILED', message: 'Provider down' } },
      ]),
    );
    const cancelled = projectRun(stamp([started, { type: 'run.cancelled' }]));

    expect(failed).toMatchObject({ status: 'error', error: { code: 'LLM_FAILED' } });
    expect(failed.feed.at(-1)?.text).toBe('The run stopped: Provider down');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.feed.at(-1)?.text).toBe('Stopped on request.');
  });

  it('celebrates a clean run and handles odd values in narration', () => {
    const passed = projectRun(
      stamp([started, { type: 'run.finished', status: 'passed', durationMs: 1 }]),
    );

    expect(passed.feed.at(-1)).toMatchObject({ text: 'Landed. Every check passed.', tone: 'good' });
    const [unknownScenario] = stamp([{ type: 'scenario.started', scenarioId: 'nope' }]);
    expect(unknownScenario && narrateEvent(unknownScenario, EMPTY_RUN_VIEW)?.text).toBe(
      'Flying "a scenario".',
    );
    const [oddPage] = stamp([{ type: 'explore.page', url: 'not a url', title: '' }]);
    expect(oddPage && narrateEvent(oddPage, EMPTY_RUN_VIEW)?.text).toBe('Read not a url.');
    const [silentFailure] = stamp([
      { type: 'step.finished', result: aStepResult({ status: 'failed', error: 'x' }) },
    ]);
    expect(silentFailure && narrateEvent(silentFailure, EMPTY_RUN_VIEW)?.tone).toBe('bad');
  });
});
