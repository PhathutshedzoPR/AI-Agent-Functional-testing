import {
  Finding,
  StepResult,
  type Healing,
  type PlanStep,
  type Scenario,
  type ScenarioStatus,
} from '../domain';
import { AppError, AssertionFailedError, RunCancelledError } from '../errors';
import type { IArtifactStore, IBrowserSession, IClock, IIdGenerator } from '../ports';
import type { ActionRegistry } from './actions';
import type { RunContext } from './RunContext';

export type StepFailure = Readonly<{ step: PlanStep; expected: string; actual: string }>;

export type ScenarioOutcome = Readonly<{
  scenario: Scenario;
  status: ScenarioStatus;
  results: readonly StepResult[];
  failure: StepFailure | null;
  findings: readonly Finding[];
}>;

/** Repairs a step whose locator broke. Returns null when it cannot (Phase 3 plugs in here). */
export interface IStepRepairer {
  repair(
    step: PlanStep,
    error: AppError,
    session: IBrowserSession,
    context: RunContext,
  ): Promise<Healing | null>;
}

export type ExecutorDependencies = Readonly<{
  registry: ActionRegistry;
  artifacts: IArtifactStore;
  clock: IClock;
  ids: IIdGenerator;
  repairer: IStepRepairer | null;
}>;

/**
 * Runs one scenario's steps in a real browser session. Every verdict comes from the browser,
 * every duration is measured and every screenshot is captured. After a failure the remaining
 * steps are skipped.
 */
export class ScenarioExecutor {
  constructor(private readonly deps: ExecutorDependencies) {}

  async run(
    scenario: Scenario,
    session: IBrowserSession,
    context: RunContext,
  ): Promise<ScenarioOutcome> {
    await context.emit({ type: 'scenario.started', scenarioId: scenario.id });
    const results: StepResult[] = [];
    const findings: Finding[] = [];
    let failure: StepFailure | null = null;

    for (const step of scenario.steps) {
      if (failure) {
        const skipped = StepResult.skipped(scenario.id, step.id);
        results.push(skipped);
        await context.emit({ type: 'step.finished', result: skipped });
        continue;
      }
      RunCancelledError.throwIfAborted(context.signal);
      const { result, error } = await this.runStep(scenario, step, session, context);
      results.push(result);
      findings.push(...(await this.recordFindings(scenario, step, session, context)));
      if (error) failure = describeFailure(step, error);
    }

    const status = scenarioStatus(results);
    await context.emit({ type: 'scenario.finished', scenarioId: scenario.id, status });
    return { scenario, status, results, failure, findings };
  }

  private async runStep(
    scenario: Scenario,
    step: PlanStep,
    session: IBrowserSession,
    context: RunContext,
  ): Promise<{ result: StepResult; error: AppError | null }> {
    await context.emit({ type: 'step.started', scenarioId: scenario.id, stepId: step.id });
    const started = this.deps.clock.monotonicMs();
    let error: AppError | null = null;
    let healing: Healing | null = null;
    try {
      healing = await this.execute(step, session, context);
    } catch (caught) {
      // A stop request closes the browser, which makes the current step fail; report the stop.
      RunCancelledError.throwIfAborted(context.signal);
      if (!(caught instanceof AppError)) throw caught;
      error = caught;
    }
    const durationMs = Math.max(0, Math.round(this.deps.clock.monotonicMs() - started));
    const screenshot = await this.capture(context.runId, step.id, session);
    const result = StepResult.create({
      stepId: step.id,
      scenarioId: scenario.id,
      status: statusOf(error, healing),
      durationMs,
      url: session.currentUrl(),
      screenshot,
      error: error?.message ?? null,
      healing,
    });
    await context.emit({ type: 'step.finished', result });
    return { result, error };
  }

  private async execute(
    step: PlanStep,
    session: IBrowserSession,
    context: RunContext,
  ): Promise<Healing | null> {
    const action = this.deps.registry.get(step.action);
    const stepContext = { session, baseUrl: context.start };
    try {
      await action.execute(step, stepContext);
      return null;
    } catch (error) {
      const healing =
        error instanceof AppError && this.deps.repairer
          ? await this.deps.repairer.repair(step, error, session, context)
          : null;
      if (!healing) throw error;
      // Retry once with the repaired locator; a second failure is a real failure.
      await action.execute({ ...step, target: healing.to }, stepContext);
      return healing;
    }
  }

  private async capture(runId: string, stepId: string, session: IBrowserSession): Promise<boolean> {
    try {
      await this.deps.artifacts.saveScreenshot(runId, stepId, await session.screenshot());
      return true;
    } catch (error) {
      // A crashed or closed page has nothing to show; the step result says so (screenshot false).
      if (error instanceof AppError) return false;
      throw error;
    }
  }

  private async recordFindings(
    scenario: Scenario,
    step: PlanStep,
    session: IBrowserSession,
    context: RunContext,
  ): Promise<Finding[]> {
    const findings = session
      .drainFindings()
      .map((raw) =>
        Finding.create({
          ...raw,
          id: this.deps.ids.next(),
          scenarioId: scenario.id,
          stepId: step.id,
        }),
      );
    for (const finding of findings) {
      await context.emit({ type: 'finding', finding });
    }
    return findings;
  }
}

function statusOf(error: AppError | null, healing: Healing | null): StepResult['status'] {
  if (error) return 'failed';
  return healing ? 'healed' : 'passed';
}

function scenarioStatus(results: readonly StepResult[]): ScenarioStatus {
  if (results.some((result) => result.status === 'failed')) return 'failed';
  return results.some((result) => result.status === 'healed') ? 'healed' : 'passed';
}

function describeFailure(step: PlanStep, error: AppError): StepFailure {
  if (error instanceof AssertionFailedError) {
    return { step, expected: error.expected, actual: error.actual };
  }
  return { step, expected: `"${step.intent}" to work`, actual: error.message };
}
