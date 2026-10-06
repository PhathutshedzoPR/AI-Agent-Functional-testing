import { BugReport, DEFAULT_SEVERITY, describeStep } from '../domain';
import type { IIdGenerator } from '../ports';
import type { ScenarioOutcome } from './ScenarioExecutor';

/**
 * Turns a failed scenario into a bug report with template wording. The wording call in Phase 3
 * may improve titles; it never changes what failed.
 */
export class BugReporter {
  constructor(private readonly ids: IIdGenerator) {}

  report(outcome: ScenarioOutcome): BugReport | null {
    const { scenario, failure } = outcome;
    if (outcome.status !== 'failed' || !failure) return null;
    const failedAt = scenario.steps.findIndex((step) => step.id === failure.step.id);
    const reproduce = scenario.steps.slice(0, failedAt + 1).map(describeStep);
    return BugReport.create({
      id: this.ids.next(),
      title: `${scenario.title}: ${failure.step.intent} failed`,
      severity: DEFAULT_SEVERITY[scenario.kind],
      scenarioId: scenario.id,
      stepsToReproduce: reproduce,
      expected: capitalise(failure.expected),
      actual: capitalise(failure.actual),
      screenshotStepId: failure.step.id,
      findings: outcome.findings,
    });
  }
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
