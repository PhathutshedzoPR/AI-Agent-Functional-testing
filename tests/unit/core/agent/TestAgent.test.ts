import { describe, expect, it } from 'vitest';
import { BudgetedLanguageModel, rebasePlan } from '@/core/agent';
import { TestPlan } from '@/core/domain';
import { LlmError } from '@/core/errors';
import { PlanOutputSchema } from '@/core/prompts';
import { ORDER_PLAN, SETTINGS, agentHarness } from '../../../fakes/agentHarness';
import { FakeLanguageModel } from '../../../fakes/FakeLanguageModel';
import { SequentialIdGenerator } from '../../../fakes/SequentialIdGenerator';
import { aPlan, aScenario, aStep } from '../../../fakes/domainBuilders';
import { recordingContext } from '../../../fakes/recordingContext';

const request = {
  targetLabel: 'Kota Express (stable)',
  story: 'Order a kota',
  device: 'desktop' as const,
  savedPlan: null,
};

describe('TestAgent', () => {
  it('opens every page on the requested screen and says so in run.started', async () => {
    const { agent, browsers, llm } = agentHarness();
    const context = recordingContext();

    await agent.run({ ...request, device: 'android' }, llm, context);

    expect(browsers.launches.map((launch) => launch.device)).toEqual(['android']);
    expect(context.events[0]).toMatchObject({ type: 'run.started', device: 'android' });
  });

  it('explores, plans, executes and reports, in that order', async () => {
    const { agent, browsers, llm } = agentHarness();
    const context = recordingContext();

    const status = await agent.run(request, llm, context);

    expect(status).toBe('passed');
    const types = context.events.map((event) => event.type);
    expect(types.slice(0, 4)).toEqual(['run.started', 'explore.page', 'llm.called', 'plan.ready']);
    expect(types.at(-1)).toBe('run.finished');
    expect(types).not.toContain('bug.reported');
    expect(browsers.launches).toEqual([{ ...SETTINGS, device: 'desktop' }]);
    expect(browsers.sessions.every((session) => session.closed)).toBe(true);
    expect(browsers.closed).toBeGreaterThanOrEqual(1);
  });

  it('reports a bug and finishes failed when a check fails', async () => {
    const { agent, llm } = agentHarness('Total R 70,00');
    const context = recordingContext();

    const status = await agent.run(request, llm, context);

    expect(status).toBe('failed');
    const bug = context.events.find((event) => event.type === 'bug.reported');
    expect(bug?.type === 'bug.reported' && bug.bug.expected).toBe('The page to contain "R 35,00"');
    expect(context.events.at(-1)).toMatchObject({ type: 'run.finished', status: 'failed' });
  });

  it('runs a saved plan without exploring or calling the model', async () => {
    const { agent, llm } = agentHarness();
    const savedPlan = TestPlan.create(
      aPlan({
        scenarios: [
          aScenario({
            steps: [aStep({ action: 'navigate', target: null, value: '/demo-shop/stable' })],
          }),
        ],
      }),
    );
    const context = recordingContext();

    await agent.run({ ...request, savedPlan }, llm, context);

    expect(llm.requests).toHaveLength(0);
    expect(context.events.map((event) => event.type)).not.toContain('explore.page');
    expect(context.events[1]).toMatchObject({ type: 'plan.ready', warnings: [] });
  });

  it('closes the browser even when planning fails', async () => {
    const { agent, browsers } = agentHarness();

    await expect(
      agent.run(request, new FakeLanguageModel(), recordingContext()),
    ).rejects.toBeInstanceOf(LlmError);
    expect(browsers.closed).toBe(1);
  });

  it('closes the browser as soon as the run is stopped', async () => {
    const { agent, browsers, llm } = agentHarness();
    const controller = new AbortController();
    const context = recordingContext({ signal: controller.signal });
    const originalEmit = context.emit;
    const stopping = {
      ...context,
      emit: async (payload: Parameters<typeof originalEmit>[0]) => {
        await originalEmit(payload);
        if (payload.type === 'plan.ready') controller.abort();
      },
    };

    await expect(agent.run(request, llm, stopping)).rejects.toMatchObject({ reason: 'cancelled' });
    expect(browsers.closed).toBeGreaterThanOrEqual(2);
  });
});

describe('BudgetedLanguageModel', () => {
  it('counts calls, reports each one and refuses past the cap', async () => {
    const context = recordingContext();
    const inner = new FakeLanguageModel().answer('plan', ORDER_PLAN);
    const budgeted = new BudgetedLanguageModel(inner, 1, context.emit);
    const call = () =>
      budgeted.generateObject({
        purpose: 'plan',
        system: 's',
        prompt: 'p',
        schema: PlanOutputSchema,
        temperature: 0,
      });

    await call();

    await expect(call()).rejects.toThrow('This run has used all 1 of its LLM calls.');
    expect(budgeted.callsUsed).toBe(1);
    expect(budgeted.replayed).toBe(false);
    expect(context.events).toEqual([{ type: 'llm.called', purpose: 'plan', used: 1, max: 1 }]);
  });
});

describe('rebasePlan', () => {
  it('moves navigate paths to the new start and renews every id', () => {
    const plan = TestPlan.create(
      aPlan({
        scenarios: [
          aScenario({
            id: 'old-scenario',
            steps: [
              aStep({ id: 'a', action: 'navigate', target: null, value: '/demo-shop/stable/cart' }),
              aStep({ id: 'b', action: 'navigate', target: null, value: '/demo-shop/stable' }),
              aStep({ id: 'c', action: 'navigate', target: null, value: '/elsewhere' }),
              aStep({ id: 'd' }),
            ],
          }),
        ],
      }),
    );

    const rebased = rebasePlan(
      plan,
      new URL('http://localhost:3000/demo-shop/stable'),
      new URL('http://localhost:3000/demo-shop/redesign/'),
      new SequentialIdGenerator('new'),
    );

    const [scenario] = rebased.scenarios;
    expect(scenario?.id).toBe('new-1');
    expect(scenario?.steps.map((step) => [step.id, step.value])).toEqual([
      ['new-2', '/demo-shop/redesign/cart'],
      ['new-3', '/demo-shop/redesign'],
      ['new-4', '/elsewhere'],
      ['new-5', null],
    ]);
  });
});
