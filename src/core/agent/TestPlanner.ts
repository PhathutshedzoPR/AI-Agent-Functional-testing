import { Scenario, TestPlan } from '../domain';
import { DomainError } from '../errors';
import type { IIdGenerator, ILanguageModel, PageSnapshot } from '../ports';
import { PLAN_TEMPERATURE, PlanOutputSchema, buildPlanPrompt, type PlanOutput } from '../prompts';
import { parseCriteria } from './parseCriteria';
import type { RawPlanStep, StepFactory } from './StepFactory';

export type PlannerLimits = Readonly<{ maxScenarios: number; maxSteps: number }>;

export type PlannedTests = Readonly<{
  plan: TestPlan;
  warnings: readonly string[];
  /** True when the story had no acceptance criteria and the planner proposed its own. */
  criteriaInferred: boolean;
}>;

type ProposedScenario = PlanOutput['scenarios'][number];

/**
 * Asks the model for a plan, then keeps only what our rules accept. The model proposes; every
 * step goes through StepFactory, and anything dropped is reported as a warning.
 */
export class TestPlanner {
  constructor(
    private readonly steps: StepFactory,
    private readonly ids: IIdGenerator,
    private readonly limits: PlannerLimits,
  ) {}

  async plan(
    llm: ILanguageModel,
    input: Readonly<{ start: URL; story: string | null; pages: readonly PageSnapshot[] }>,
  ): Promise<PlannedTests> {
    const criteria = parseCriteria(input.story);
    const { system, prompt } = buildPlanPrompt({
      startUrl: input.start.href,
      story: input.story,
      criteria,
      pages: input.pages,
      ...this.limits,
    });
    const output = await llm.generateObject({
      purpose: 'plan',
      system,
      prompt,
      schema: PlanOutputSchema,
      temperature: PLAN_TEMPERATURE,
    });
    return this.accept(output, input.start, criteria.length === 0);
  }

  private accept(output: PlanOutput, start: URL, criteriaInferred: boolean): PlannedTests {
    const warnings: string[] = [];
    if (output.scenarios.length > this.limits.maxScenarios) {
      warnings.push(
        `The planner proposed ${output.scenarios.length} scenarios; only the first ${this.limits.maxScenarios} run.`,
      );
    }
    const scenarios = output.scenarios
      .slice(0, this.limits.maxScenarios)
      .map((proposed) => this.acceptScenario(proposed, start, warnings))
      .filter((scenario): scenario is Scenario => scenario !== null);
    if (scenarios.length === 0) {
      throw new DomainError('The planner did not return any scenario that can run.', warnings);
    }
    const plan = TestPlan.create({ summary: output.summary, scenarios });
    return { plan, warnings, criteriaInferred };
  }

  private acceptScenario(
    proposed: ProposedScenario,
    start: URL,
    warnings: string[],
  ): Scenario | null {
    const title = proposed.title.trim() || 'Untitled scenario';
    const raw: RawPlanStep[] = [...proposed.steps];
    // Each scenario gets a fresh browser, so it must open a page before anything else.
    if (raw[0]?.action !== 'navigate') {
      raw.unshift({
        action: 'navigate',
        target: null,
        value: start.pathname,
        intent: 'Open the start page',
      });
    }
    if (raw.length > this.limits.maxSteps) {
      warnings.push(
        `"${title}" had ${raw.length} steps; only the first ${this.limits.maxSteps} run.`,
      );
    }
    const accepted = raw.slice(0, this.limits.maxSteps).flatMap((step) => {
      const built = this.steps.build(step, start);
      if (built.ok) return [built.step];
      warnings.push(`${title}: ${built.warning}`);
      return [];
    });
    if (!accepted.some((step) => step.action !== 'navigate')) {
      warnings.push(`Dropped scenario "${title}": none of its steps can run.`);
      return null;
    }
    if (!accepted.at(-1)?.action.startsWith('assert')) {
      warnings.push(`"${title}" does not end with an assertion, so it can only fail on errors.`);
    }
    return Scenario.create({
      id: this.ids.next(),
      title,
      kind: proposed.kind,
      criterion: proposed.criterion,
      priority: proposed.priority,
      steps: accepted,
    });
  }
}
