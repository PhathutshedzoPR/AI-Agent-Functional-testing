import { describe, expect, it } from 'vitest';
import { BugReporter } from '@/core/agent/BugReporter';
import { createDefaultActionRegistry } from '@/core/agent/actions';
import { ScenarioExecutor, type IStepRepairer } from '@/core/agent/ScenarioExecutor';
import { describeStep, type Healing, type Scenario } from '@/core/domain';
import { BrowserError, RunCancelledError } from '@/core/errors';
import type { IBrowserSession } from '@/core/ports';
import { FakeArtifactStore } from '../../../fakes/FakeArtifactStore';
import { FakeBrowserSession } from '../../../fakes/FakeBrowserSession';
import { FixedClock } from '../../../fakes/FixedClock';
import { SequentialIdGenerator } from '../../../fakes/SequentialIdGenerator';
import { RUN_ID, aRoleLocator, aScenario, aStep } from '../../../fakes/domainBuilders';
import { recordingContext } from '../../../fakes/recordingContext';

const add = aRoleLocator('button', 'Add to order');
const bag = aRoleLocator('button', 'Add to bag');
const scenario: Scenario = aScenario({
  kind: 'happy',
  steps: [
    aStep({
      id: 's1',
      action: 'navigate',
      target: null,
      value: '/demo-shop/stable',
      intent: 'Open',
    }),
    aStep({ id: 's2', action: 'click', target: add, intent: 'Add a kota' }),
    aStep({ id: 's3', action: 'assertText', target: null, value: 'R 70,00', intent: 'Total' }),
    aStep({ id: 's4', action: 'click', target: add, intent: 'Add another' }),
  ],
});

function executor(repairer: IStepRepairer | null = null) {
  const clock = new FixedClock();
  const artifacts = new FakeArtifactStore();
  const run = new ScenarioExecutor({
    registry: createDefaultActionRegistry(),
    artifacts,
    clock,
    ids: new SequentialIdGenerator('finding'),
    repairer,
  });
  return { run, clock, artifacts };
}

/** A session whose clicks take 120 ms on the fixed clock. */
function slowSession(clock: FixedClock): FakeBrowserSession {
  const session = new FakeBrowserSession().show(add);
  const click = session.click.bind(session);
  session.click = async (target) => {
    clock.advance(120);
    await click(target);
  };
  return session;
}

describe('ScenarioExecutor', () => {
  it('runs every step, measuring time and saving a screenshot per step', async () => {
    const { run, clock, artifacts } = executor();
    const session = slowSession(clock);
    session.pageText = 'Total R 70,00';
    const context = recordingContext();

    const outcome = await run.run(scenario, session, context);

    expect(outcome.status).toBe('passed');
    expect(outcome.results.map((r) => [r.status, r.durationMs, r.screenshot])).toEqual([
      ['passed', 0, true],
      ['passed', 120, true],
      ['passed', 0, true],
      ['passed', 120, true],
    ]);
    expect(artifacts.saved.has(`${RUN_ID}/s2`)).toBe(true);
    expect(context.events.map((e) => e.type)).toEqual([
      'scenario.started',
      ...Array.from({ length: 4 }, () => ['step.started', 'step.finished']).flat(),
      'scenario.finished',
    ]);
  });

  it('fails on a broken assertion, skips the rest and keeps the evidence', async () => {
    const { run, clock } = executor();
    const session = slowSession(clock);
    session.pageText = 'Total R 35,00';
    const context = recordingContext();

    const outcome = await run.run(scenario, session, context);

    expect(outcome.status).toBe('failed');
    expect(outcome.results.map((r) => r.status)).toEqual(['passed', 'passed', 'failed', 'skipped']);
    expect(outcome.failure).toMatchObject({
      step: { id: 's3' },
      expected: 'the page to contain "R 70,00"',
      actual: 'the amounts shown were R 35,00',
    });
    expect(context.events.at(-1)).toEqual({
      type: 'scenario.finished',
      scenarioId: scenario.id,
      status: 'failed',
    });
  });

  it('records browser findings against the step that caused them', async () => {
    const { run } = executor();
    const session = new FakeBrowserSession().show(add);
    session.pageText = 'R 70,00';
    session.report({ kind: 'http-error', message: 'GET /x returned 500', url: '/x', status: 500 });
    const context = recordingContext();

    const outcome = await run.run(scenario, session, context);

    expect(outcome.findings).toEqual([
      {
        id: 'finding-1',
        kind: 'http-error',
        message: 'GET /x returned 500',
        url: '/x',
        status: 500,
        scenarioId: scenario.id,
        stepId: 's1',
      },
    ]);
    expect(context.events.filter((e) => e.type === 'finding')).toHaveLength(1);
  });

  it('retries once with a repaired locator and marks the step healed', async () => {
    const healing: Healing = { from: add, to: bag, method: 'rule', strategy: 's', reason: 'r' };
    const repairer: IStepRepairer = { repair: () => Promise.resolve(healing) };
    const { run } = executor(repairer);
    const session = new FakeBrowserSession().show(bag);
    session.pageText = 'R 70,00';

    const outcome = await run.run(scenario, session, recordingContext());

    expect(outcome.status).toBe('healed');
    expect(outcome.results[1]).toMatchObject({ status: 'healed', healing });
    expect(session.calls).toContain('click button "Add to bag"');
  });

  it('fails the step when nothing can repair it', async () => {
    const repairer: IStepRepairer = { repair: () => Promise.resolve(null) };
    const { run } = executor(repairer);
    const session = new FakeBrowserSession();

    const outcome = await run.run(scenario, session, recordingContext());

    expect(outcome.results[1]).toMatchObject({
      status: 'failed',
      error: 'No button "Add to order"',
    });
    expect(outcome.failure?.expected).toBe('"Add a kota" to work');
  });

  it('notes a missing screenshot instead of failing the run', async () => {
    const { run } = executor();
    const session = new FakeBrowserSession().show(add);
    session.pageText = 'R 70,00';
    session.screenshot = () => Promise.reject(new BrowserError('other', 'page crashed'));

    const outcome = await run.run(scenario, session, recordingContext());

    expect(outcome.results.every((r) => !r.screenshot)).toBe(true);
  });

  it('stops between steps and during a step when the run is cancelled', async () => {
    const { run } = executor();
    const controller = new AbortController();
    const session: IBrowserSession = new FakeBrowserSession().show(add);
    session.click = () => {
      controller.abort(new RunCancelledError('timeout'));
      return Promise.reject(new BrowserError('other', 'Target closed'));
    };

    await expect(
      run.run(scenario, session, recordingContext({ signal: controller.signal })),
    ).rejects.toMatchObject({ reason: 'timeout' });
    await expect(
      run.run(
        scenario,
        new FakeBrowserSession(),
        recordingContext({ signal: AbortSignal.abort() }),
      ),
    ).rejects.toMatchObject({ reason: 'cancelled' });
  });

  it('lets programming errors through', async () => {
    const { run } = executor();
    const session = new FakeBrowserSession();
    session.goto = () => Promise.reject(new TypeError('bug'));

    await expect(run.run(scenario, session, recordingContext())).rejects.toBeInstanceOf(TypeError);
  });
});

describe('BugReporter', () => {
  it('reports a failed scenario with steps to reproduce and evidence', async () => {
    const { run } = executor();
    const session = new FakeBrowserSession().show(add);
    session.pageText = 'Total R 35,00';
    const outcome = await run.run(scenario, session, recordingContext());

    const bug = new BugReporter(new SequentialIdGenerator('bug')).report(outcome);

    expect(bug).toEqual({
      id: 'bug-1',
      title: 'Order two kotas: Total failed',
      severity: 'high',
      scenarioId: scenario.id,
      stepsToReproduce: scenario.steps.slice(0, 3).map((step) => describeStep(step)),
      expected: 'The page to contain "R 70,00"',
      actual: 'The amounts shown were R 35,00',
      screenshotStepId: 's3',
      findings: [],
    });
  });

  it('reports nothing for a passing scenario and uses the kind for severity', async () => {
    const { run } = executor();
    const passing = new FakeBrowserSession().show(add);
    passing.pageText = 'R 70,00';
    const reporter = new BugReporter(new SequentialIdGenerator('bug'));

    expect(reporter.report(await run.run(scenario, passing, recordingContext()))).toBeNull();

    const failing = new FakeBrowserSession().show(add);
    const edge = await run.run({ ...scenario, kind: 'edge' }, failing, recordingContext());
    expect(reporter.report(edge)?.severity).toBe('low');
  });
});

describe('describeStep', () => {
  it('reads like a person describing what to do', () => {
    const label = { by: 'label' as const, value: 'Suburb', role: null, exact: false, within: null };

    expect(
      [
        aStep({ action: 'navigate', target: null, value: '/cart' }),
        aStep({ action: 'check', target: add }),
        aStep({ action: 'fill', target: label, value: 'Soweto' }),
        aStep({ action: 'fill', target: label, value: '' }),
        aStep({ action: 'select', target: label, value: 'Soweto' }),
        aStep({ action: 'press', target: null, value: 'Enter' }),
        aStep({ action: 'press', target: label, value: 'Tab' }),
        aStep({ action: 'assertVisible', target: add }),
        aStep({ action: 'assertHidden', target: add }),
        aStep({ action: 'assertUrl', target: null, value: '/confirmation' }),
        aStep({ action: 'assertValue', target: label, value: 'Soweto' }),
      ].map((step) => describeStep(step)),
    ).toEqual([
      'Open /cart',
      'Tick button "Add to order"',
      'Type "Soweto" into field labelled "Suburb"',
      'Clear field labelled "Suburb"',
      'Choose "Soweto" in field labelled "Suburb"',
      'Press Enter',
      'Press Tab in field labelled "Suburb"',
      'Check that button "Add to order" is visible',
      'Check that button "Add to order" is hidden',
      'Check that the URL contains "/confirmation"',
      'Check that field labelled "Suburb" has the value "Soweto"',
    ]);
  });
});

describe('ScenarioExecutor renames', () => {
  const place = aRoleLocator('button', 'Place order');
  const confirm = aRoleLocator('button', 'Confirm order');
  const checkout = aScenario({
    steps: [
      aStep({ id: 'p1', action: 'click', target: place, intent: 'Place the order' }),
      aStep({ id: 'p2', action: 'assertHidden', target: place, intent: 'Form is gone' }),
    ],
  });
  const healing: Healing = {
    from: place,
    to: confirm,
    method: 'llm',
    strategy: 'llm',
    reason: 'Renamed to Confirm order.',
  };

  it('applies a rename to later steps, so a renamed button is never hidden for free', async () => {
    let repairs = 0;
    const repairer: IStepRepairer = {
      repair: () => {
        repairs += 1;
        return Promise.resolve(healing);
      },
    };
    const { run } = executor(repairer);
    // The order did not go through: "Confirm order" is still on the page.
    const session = new FakeBrowserSession().show(confirm);

    const outcome = await run.run(checkout, session, recordingContext());

    expect(repairs).toBe(1);
    expect(outcome.results.map((r) => r.status)).toEqual(['healed', 'failed']);
    expect(outcome.failure?.expected).toBe('button "Confirm order" to be hidden');
  });

  it('marks reused renames for review and passes when the form really went away', async () => {
    const repairer: IStepRepairer = { repair: () => Promise.resolve(healing) };
    const { run } = executor(repairer);
    const session = new FakeBrowserSession().show(confirm);
    const click = session.click.bind(session);
    session.click = async (target) => {
      await click(target);
      session.hide(confirm);
    };

    const outcome = await run.run(checkout, session, recordingContext());

    expect(outcome.status).toBe('healed');
    expect(outcome.results[1]?.healing).toMatchObject({ strategy: 'reused', to: confirm });
  });
});
