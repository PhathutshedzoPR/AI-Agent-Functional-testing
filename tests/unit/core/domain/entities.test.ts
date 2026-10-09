import { describe, expect, it } from 'vitest';
import {
  BugReport,
  Finding,
  Healing,
  PlanStep,
  Scenario,
  StepResult,
  TestPlan,
  TestRun,
} from '@/core/domain';
import { DomainError } from '@/core/errors';
import {
  aBug,
  aPlan,
  aRoleLocator,
  aRun,
  aScenario,
  aStep,
  aStepResult,
} from '../../../fakes/domainBuilders';

describe('PlanStep.create', () => {
  it('trims the intent', () => {
    expect(PlanStep.create(aStep({ intent: '  Open the menu ' })).intent).toBe('Open the menu');
  });

  it('rejects a blank intent and unknown actions', () => {
    expect(() => PlanStep.create(aStep({ intent: ' ' }))).toThrow(DomainError);
    expect(() => PlanStep.create({ ...aStep(), action: 'evaluate' })).toThrow(DomainError);
  });
});

describe('Scenario.create', () => {
  it('trims the title and turns a blank criterion into null', () => {
    const scenario = Scenario.create(aScenario({ title: ' Order ', criterion: '  ' }));

    expect(scenario.title).toBe('Order');
    expect(scenario.criterion).toBeNull();
  });

  it('keeps a real criterion', () => {
    expect(Scenario.create(aScenario({ criterion: ' AC1 ' })).criterion).toBe('AC1');
  });

  it('rejects a blank title, no steps and duplicate step ids', () => {
    expect(() => Scenario.create(aScenario({ title: '' }))).toThrow(DomainError);
    expect(() => Scenario.create(aScenario({ steps: [] }))).toThrow(DomainError);
    expect(() => Scenario.create(aScenario({ steps: [aStep(), aStep()] }))).toThrow(
      /duplicate step ids/,
    );
  });
});

describe('TestPlan', () => {
  it('trims the summary and counts steps', () => {
    const plan = TestPlan.create(
      aPlan({
        summary: ' Plan ',
        scenarios: [
          aScenario({ id: 'a', steps: [aStep({ id: '1' }), aStep({ id: '2' })] }),
          aScenario({ id: 'b' }),
        ],
      }),
    );

    expect(plan.summary).toBe('Plan');
    expect(TestPlan.stepCount(plan)).toBe(3);
  });

  it('rejects an empty plan and duplicate scenario ids', () => {
    expect(() => TestPlan.create(aPlan({ scenarios: [] }))).toThrow(DomainError);
    expect(() => TestPlan.create(aPlan({ scenarios: [aScenario(), aScenario()] }))).toThrow(
      /duplicate scenario ids/,
    );
  });
});

describe('Healing.create', () => {
  const from = aRoleLocator('button', 'Add to order');

  it('accepts a changed locator', () => {
    const healing = Healing.create({
      from,
      to: aRoleLocator('button', 'Add to bag'),
      method: 'rule',
      strategy: 'similar-name',
      reason: 'Same role, similar name',
    });

    expect(healing.to.value).toBe('Add to bag');
  });

  it('rejects a healing that changes nothing', () => {
    expect(() =>
      Healing.create({ from, to: { ...from }, method: 'llm', strategy: 'llm', reason: 'same' }),
    ).toThrow(/must change/);
  });
});

describe('StepResult', () => {
  const healing = {
    from: aRoleLocator('button', 'Checkout'),
    to: aRoleLocator('button', 'Proceed to payment'),
    method: 'rule' as const,
    strategy: 'similar-role',
    reason: 'Only checkout-like button',
  };

  it('accepts consistent results', () => {
    expect(StepResult.create(aStepResult()).status).toBe('passed');
    expect(StepResult.create(aStepResult({ status: 'healed', healing })).healing).toEqual(healing);
    expect(StepResult.create(aStepResult({ status: 'failed', error: 'x', healing })).status).toBe(
      'failed',
    );
  });

  it.each([
    ['a failed step without an error', aStepResult({ status: 'failed' })],
    ['a healed step without a healing', aStepResult({ status: 'healed' })],
    ['a passed step with a healing', aStepResult({ healing })],
    ['a skipped step with a screenshot', aStepResult({ status: 'skipped', screenshot: true })],
    ['a negative duration', aStepResult({ durationMs: -1 })],
  ])('rejects %s', (_label, input) => {
    expect(() => StepResult.create(input)).toThrow(DomainError);
  });

  it('builds a skipped result with no measurements', () => {
    expect(StepResult.skipped('s', 'p')).toEqual({
      stepId: 'p',
      scenarioId: 's',
      status: 'skipped',
      durationMs: 0,
      url: null,
      screenshot: false,
      error: null,
      healing: null,
    });
  });
});

describe('Finding.create', () => {
  it('accepts an HTTP error finding and rejects an unknown kind', () => {
    const finding = {
      id: 'f1',
      kind: 'http-error',
      message: 'GET /specials returned 404',
      url: 'http://localhost:3000/demo-shop/buggy/specials',
      status: 404,
      scenarioId: null,
      stepId: null,
    };

    expect(Finding.create(finding).status).toBe(404);
    expect(() => Finding.create({ ...finding, kind: 'vibes' })).toThrow(DomainError);
  });
});

describe('BugReport.create', () => {
  it('trims the title and requires steps to reproduce', () => {
    expect(BugReport.create(aBug({ title: ' Total wrong ' })).title).toBe('Total wrong');
    expect(() => BugReport.create(aBug({ title: '  ' }))).toThrow(DomainError);
    expect(() => BugReport.create(aBug({ stepsToReproduce: [] }))).toThrow(DomainError);
  });
});

describe('TestRun', () => {
  it('normalises a blank story to null', () => {
    expect(TestRun.create(aRun({ story: '   ' })).story).toBeNull();
    expect(TestRun.create(aRun({ story: ' Order ' })).story).toBe('Order');
  });

  it('rejects a non-UUID id and an over-long story', () => {
    expect(() => TestRun.create(aRun({ id: 'run-1' }))).toThrow(DomainError);
    expect(() => TestRun.create(aRun({ story: 'x'.repeat(2_001) }))).toThrow(DomainError);
  });

  it('stamps finishedAt only for final statuses', () => {
    const at = new Date('2026-10-06T08:01:00.000Z');
    const running = TestRun.transition(aRun(), 'running', at);
    const passed = TestRun.transition(running, 'passed', at);

    expect(running.finishedAt).toBeNull();
    expect(passed.finishedAt).toBe(at.toISOString());
    expect(TestRun.isFinal('passed')).toBe(true);
    expect(TestRun.isFinal('queued')).toBe(false);
  });

  it('never changes a finished run', () => {
    const done = aRun({ status: 'cancelled' });

    expect(() => TestRun.transition(done, 'running', new Date())).toThrow(/already finished/);
  });
});
