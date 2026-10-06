import { TestPlan, type PlanStep } from '../domain';
import type { IIdGenerator } from '../ports';

/**
 * Re-targets a saved plan at another start page, such as the same shop's next release. Navigate
 * paths under the old start path move under the new one; step and scenario ids are renewed so
 * the new run's screenshots and results never collide with the old run's.
 */
export function rebasePlan(plan: TestPlan, from: URL, to: URL, ids: IIdGenerator): TestPlan {
  const oldBase = from.pathname.replace(/\/$/, '');
  const newBase = to.pathname.replace(/\/$/, '');
  const move = (step: PlanStep): PlanStep => {
    const path = step.value ?? '';
    const underOldBase = path === oldBase || path.startsWith(`${oldBase}/`);
    const value =
      step.action === 'navigate' && underOldBase
        ? newBase + path.slice(oldBase.length)
        : step.value;
    return { ...step, id: ids.next(), value };
  };
  return TestPlan.create({
    summary: plan.summary,
    scenarios: plan.scenarios.map((scenario) => ({
      ...scenario,
      id: ids.next(),
      steps: scenario.steps.map(move),
    })),
  });
}
