import { describe, expect, it } from 'vitest';
import { createDefaultActionRegistry } from '@/core/agent/actions';
import { parseCriteria } from '@/core/agent/parseCriteria';
import { StepFactory } from '@/core/agent/StepFactory';
import { TestPlanner } from '@/core/agent/TestPlanner';
import { DomainError } from '@/core/errors';
import type { PlanOutput } from '@/core/prompts';
import { FakeLanguageModel } from '../../../fakes/FakeLanguageModel';
import { SequentialIdGenerator } from '../../../fakes/SequentialIdGenerator';
import { aRoleLocator } from '../../../fakes/domainBuilders';

const START = new URL('http://localhost:3000/demo-shop/stable');
const PAGES = [{ url: START.href, title: 'Kota Express', aria: '- heading "Our kotas"' }];
const add = aRoleLocator('button', 'Add to order', {
  within: { role: 'article', hasText: 'Quarter Kota' },
});

type Step = PlanOutput['scenarios'][number]['steps'][number];
const step = (overrides: Partial<Step>): Step => ({
  action: 'click',
  target: add,
  value: null,
  intent: 'Add a Quarter Kota',
  ...overrides,
});
const scenario = (
  title: string,
  steps: Step[],
  kind: 'happy' | 'negative' | 'edge' = 'happy',
): PlanOutput['scenarios'][number] => ({ title, kind, criterion: null, priority: 'high', steps });
const assertTotal = step({
  action: 'assertText',
  target: null,
  value: 'Total R 70,00',
  intent: 'Check total',
});

function planner(limits = { maxScenarios: 3, maxSteps: 5 }): TestPlanner {
  const ids = new SequentialIdGenerator('id');
  return new TestPlanner(new StepFactory(createDefaultActionRegistry(), ids), ids, limits);
}

function modelAnswering(output: PlanOutput): FakeLanguageModel {
  return new FakeLanguageModel().answer('plan', output);
}

describe('TestPlanner', () => {
  it('turns a proposed plan into executable scenarios', async () => {
    const llm = modelAnswering({
      summary: 'Orders kotas',
      criteria: ['Total is right'],
      scenarios: [
        scenario('Order two', [
          step({ action: 'navigate', target: null, value: '/demo-shop/stable', intent: 'Open' }),
          step({}),
          assertTotal,
        ]),
      ],
    });

    const { plan, warnings, criteriaInferred } = await planner().plan(llm, {
      start: START,
      story: 'Order two kotas',
      pages: PAGES,
    });

    expect(warnings).toEqual([]);
    expect(criteriaInferred).toBe(true);
    expect(plan.scenarios).toHaveLength(1);
    expect(plan.scenarios[0]?.steps.map((s) => s.action)).toEqual([
      'navigate',
      'click',
      'assertText',
    ]);
    expect(llm.requests[0]).toMatchObject({ purpose: 'plan', temperature: 0.2 });
  });

  it('opens the start page first when the model forgot to', async () => {
    const llm = modelAnswering({
      summary: 's',
      criteria: [],
      scenarios: [scenario('No navigate', [step({}), assertTotal])],
    });

    const { plan } = await planner().plan(llm, { start: START, story: null, pages: PAGES });

    expect(plan.scenarios[0]?.steps[0]).toMatchObject({
      action: 'navigate',
      value: '/demo-shop/stable',
      intent: 'Open the start page',
    });
  });

  it('passes story criteria to the prompt and reports them as not inferred', async () => {
    const llm = modelAnswering({
      summary: 's',
      criteria: [],
      scenarios: [scenario('One', [step({}), assertTotal])],
    });

    const result = await planner().plan(llm, {
      start: START,
      story: 'As a customer\n- The total is right\n- Checkout works',
      pages: PAGES,
    });

    expect(result.criteriaInferred).toBe(false);
    expect(llm.requests[0]?.prompt).toContain('- The total is right\n- Checkout works');
  });

  it('enforces scenario and step limits with warnings', async () => {
    const many = Array.from({ length: 4 }, (_, i) => scenario(`S${i}`, [step({}), assertTotal]));
    const long = scenario('Long', [step({}), step({}), step({}), step({}), step({}), assertTotal]);
    const llm = modelAnswering({ summary: 's', criteria: [], scenarios: [long, ...many] });

    const { plan, warnings } = await planner().plan(llm, {
      start: START,
      story: null,
      pages: PAGES,
    });

    expect(plan.scenarios).toHaveLength(3);
    expect(plan.scenarios[0]?.steps).toHaveLength(5);
    expect(warnings).toEqual(
      expect.arrayContaining([
        'The planner proposed 5 scenarios; only the first 3 run.',
        '"Long" had 7 steps; only the first 5 run.',
        '"Long" does not end with an assertion, so it can only fail on errors.',
      ]),
    );
  });

  it('drops invalid steps and scenarios with nothing left, and says why', async () => {
    const llm = modelAnswering({
      summary: 's',
      criteria: [],
      scenarios: [
        scenario('Bad step', [step({ action: 'click', target: null }), step({}), assertTotal]),
        scenario('Hopeless', [step({ target: null }), step({ action: 'assertUrl', value: null })]),
      ],
    });

    const { plan, warnings } = await planner().plan(llm, {
      start: START,
      story: null,
      pages: PAGES,
    });

    expect(plan.scenarios.map((s) => s.title)).toEqual(['Bad step']);
    expect(warnings).toEqual([
      'Bad step: Dropped step "Add a Quarter Kota": a click step needs a target.',
      'Hopeless: Dropped step "Add a Quarter Kota": a click step needs a target.',
      'Hopeless: Dropped step "Add a Quarter Kota": a assertUrl step needs a value.',
      'Dropped scenario "Hopeless": none of its steps can run.',
    ]);
  });

  it('fails clearly when no scenario survives', async () => {
    const llm = modelAnswering({
      summary: 's',
      criteria: [],
      scenarios: [scenario('Hopeless', [step({ target: null })])],
    });

    await expect(
      planner().plan(llm, { start: START, story: null, pages: PAGES }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('names untitled scenarios', async () => {
    const llm = modelAnswering({
      summary: 's',
      criteria: [],
      scenarios: [scenario('  ', [step({}), assertTotal])],
    });

    const { plan } = await planner().plan(llm, { start: START, story: null, pages: PAGES });

    expect(plan.scenarios[0]?.title).toBe('Untitled scenario');
  });
});

describe('parseCriteria', () => {
  it('reads bullet and numbered lines', () => {
    expect(
      parseCriteria('Story\n- Total is right\n* Fee shown\n1. Cellphone checked\n2) Done'),
    ).toEqual(['Total is right', 'Fee shown', 'Cellphone checked', 'Done']);
  });

  it('groups Given/When/Then lines into one criterion per Given', () => {
    expect(
      parseCriteria(
        'Given two kotas in the cart\nWhen I open the cart\nThen the total is R 70,00\nGiven an empty cart\nThen checkout shows a notice',
      ),
    ).toEqual([
      'Given two kotas in the cart When I open the cart Then the total is R 70,00',
      'Given an empty cart Then checkout shows a notice',
    ]);
  });

  it('returns nothing for free text or no story, and drops duplicates', () => {
    expect(parseCriteria(null)).toEqual([]);
    expect(parseCriteria('Order two kotas and check out')).toEqual([]);
    expect(parseCriteria('- Same\n- Same')).toEqual(['Same']);
    expect(parseCriteria('When I pay\nThen it works')).toEqual(['When I pay Then it works']);
  });
});
