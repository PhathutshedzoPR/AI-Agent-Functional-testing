import {
  BugReporter,
  ScenarioExecutor,
  SiteExplorer,
  StepFactory,
  TestAgent,
  TestPlanner,
  createDefaultActionRegistry,
  type AgentSettings,
} from '@/core/agent';
import type { PlanOutput } from '@/core/prompts';
import { FakeArtifactStore } from './FakeArtifactStore';
import { FakeBrowserFactory } from './FakeBrowserFactory';
import { FakeBrowserSession } from './FakeBrowserSession';
import { FakeLanguageModel } from './FakeLanguageModel';
import { FixedClock } from './FixedClock';
import { SequentialIdGenerator } from './SequentialIdGenerator';
import { aRoleLocator } from './domainBuilders';

export const SETTINGS: AgentSettings = {
  maxPages: 3,
  maxScenarios: 3,
  maxSteps: 8,
  maxLlmCalls: 4,
  stepTimeoutMs: 1_000,
  headless: true,
  slowMoMs: 0,
};

export const ADD = aRoleLocator('button', 'Add to order', {
  within: { role: 'article', hasText: 'Quarter Kota' },
});

/** A one-scenario plan: open the menu, add a kota, check the total. */
export const ORDER_PLAN: PlanOutput = {
  summary: 'Checks ordering',
  criteria: ['Total is right'],
  scenarios: [
    {
      title: 'Order a kota',
      kind: 'happy',
      criterion: 'Total is right',
      priority: 'high',
      steps: [
        { action: 'navigate', target: null, value: '/demo-shop/stable', intent: 'Open the menu' },
        { action: 'click', target: ADD, value: null, intent: 'Add a Quarter Kota' },
        { action: 'assertText', target: null, value: 'R 35,00', intent: 'Total is R 35,00' },
      ],
    },
  ],
};

/** A shop page with the add button, showing `pageText`. */
export function shopSession(pageText: string): FakeBrowserSession {
  const session = new FakeBrowserSession().show(ADD);
  session.pageText = pageText;
  return session;
}

/** A TestAgent wired to fakes, with the pieces exposed for assertions. */
export function agentHarness(pageText = 'Total R 35,00', plan: PlanOutput = ORDER_PLAN) {
  const ids = new SequentialIdGenerator('id');
  const clock = new FixedClock();
  const browsers = new FakeBrowserFactory(() => shopSession(pageText));
  const artifacts = new FakeArtifactStore();
  const llm = new FakeLanguageModel().answer('plan', plan);
  const steps = new StepFactory(createDefaultActionRegistry(), ids);
  const agent = new TestAgent({
    browsers,
    explorer: new SiteExplorer({ maxPages: SETTINGS.maxPages, snapshotMaxChars: 2_000 }),
    planner: new TestPlanner(steps, ids, SETTINGS),
    executor: new ScenarioExecutor({
      registry: createDefaultActionRegistry(),
      artifacts,
      clock,
      ids,
      repairer: null,
    }),
    reporter: new BugReporter(ids),
    clock,
    ids,
    settings: SETTINGS,
  });
  return { agent, browsers, artifacts, llm, clock, ids };
}
