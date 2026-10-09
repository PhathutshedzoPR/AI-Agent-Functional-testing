import { TestPlan, type ActionType, type PlanStep } from '../domain';
import type { IIdGenerator } from '../ports';

// Steps whose value is a page address: where to go, and where the browser should have ended up.
const ADDRESS_ACTIONS: ReadonlySet<ActionType> = new Set(['navigate', 'assertUrl']);

/**
 * Re-targets a saved plan at another start page, such as the same shop's next release. Addresses
 * under the old start path (navigations and URL checks, as paths or same-site URLs) move under the
 * new one; step and scenario ids are renewed so the new run's screenshots and results never
 * collide with the old run's.
 */
export function rebasePlan(plan: TestPlan, from: URL, to: URL, ids: IIdGenerator): TestPlan {
  const oldBase = from.pathname.replace(/\/$/, '');
  const newBase = to.pathname.replace(/\/$/, '');
  const movePath = (path: string): string =>
    path === oldBase || path.startsWith(`${oldBase}/`)
      ? newBase + path.slice(oldBase.length)
      : path;
  const moveAddress = (value: string): string =>
    value.startsWith(from.origin)
      ? to.origin + movePath(value.slice(from.origin.length))
      : movePath(value);
  const move = (step: PlanStep): PlanStep => ({
    ...step,
    id: ids.next(),
    value:
      ADDRESS_ACTIONS.has(step.action) && step.value !== null
        ? moveAddress(step.value)
        : step.value,
  });
  return TestPlan.create({
    summary: plan.summary,
    scenarios: plan.scenarios.map((scenario) => ({
      ...scenario,
      id: ids.next(),
      steps: scenario.steps.map((step) => move(step)),
    })),
  });
}
