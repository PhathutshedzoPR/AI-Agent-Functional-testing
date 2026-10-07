import type {
  BugReport,
  Locator,
  PlanStep,
  Scenario,
  StepResult,
  TestPlan,
  TestRun,
} from '@/core/domain';

export const RUN_ID = '00000000-0000-4000-8000-000000000001';

export function aRoleLocator(
  role: Locator['role'],
  value: string,
  overrides: Partial<Locator> = {},
): Locator {
  return { by: 'role', value, role, exact: false, within: null, ...overrides };
}

export function aStep(overrides: Partial<PlanStep> = {}): PlanStep {
  return {
    id: 'step-1',
    action: 'click',
    target: aRoleLocator('button', 'Add to order'),
    value: null,
    intent: 'Add a kota to the order',
    ...overrides,
  };
}

export function aScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 'scenario-1',
    title: 'Order two kotas',
    kind: 'happy',
    criterion: null,
    priority: 'high',
    steps: [aStep()],
    ...overrides,
  };
}

export function aPlan(overrides: Partial<TestPlan> = {}): TestPlan {
  return { summary: 'Checks the order flow', scenarios: [aScenario()], ...overrides };
}

export function aStepResult(overrides: Partial<StepResult> = {}): StepResult {
  return {
    stepId: 'step-1',
    scenarioId: 'scenario-1',
    status: 'passed',
    durationMs: 120,
    url: 'http://localhost:3000/demo-shop/stable',
    screenshot: true,
    error: null,
    healing: null,
    ...overrides,
  };
}

export function aBug(overrides: Partial<BugReport> = {}): BugReport {
  return {
    id: 'bug-1',
    title: 'Cart total ignores quantity',
    severity: 'high',
    scenarioId: 'scenario-1',
    stepsToReproduce: ['Add two Quarter kotas', 'Open the cart'],
    expected: 'Total R 70,00',
    actual: 'Total R 35,00',
    screenshotStepId: 'step-1',
    findings: [],
    ...overrides,
  };
}

export function aRun(overrides: Partial<TestRun> = {}): TestRun {
  return {
    id: RUN_ID,
    targetUrl: 'http://localhost:3000/demo-shop/stable',
    targetLabel: 'Kota Express (stable)',
    story: null,
    status: 'queued',
    replayed: false,
    device: 'desktop',
    createdAt: '2026-10-06T08:00:00.000Z',
    finishedAt: null,
    ...overrides,
  };
}
