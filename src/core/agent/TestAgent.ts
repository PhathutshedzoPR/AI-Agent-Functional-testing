import { Finding, type BugReport, type RunLimits, type TestPlan } from '../domain';
import type {
  IBrowser,
  IBrowserFactory,
  IClock,
  IIdGenerator,
  ILanguageModel,
  PageSnapshot,
} from '../ports';
import { BudgetedLanguageModel } from './BudgetedLanguageModel';
import type { BugReporter } from './BugReporter';
import type { ExecutionContext, RunContext } from './RunContext';
import type { ScenarioExecutor, ScenarioOutcome } from './ScenarioExecutor';
import type { SiteExplorer } from './SiteExplorer';
import type { TestPlanner } from './TestPlanner';

export type AgentSettings = Readonly<
  RunLimits & { stepTimeoutMs: number; headless: boolean; slowMoMs: number }
>;

export type AgentRequest = Readonly<{
  targetLabel: string;
  story: string | null;
  /** A saved plan to run instead of exploring and planning (already rebased onto `start`). */
  savedPlan: TestPlan | null;
}>;

export type AgentDependencies = Readonly<{
  browsers: IBrowserFactory;
  explorer: SiteExplorer;
  planner: TestPlanner;
  executor: ScenarioExecutor;
  reporter: BugReporter;
  clock: IClock;
  ids: IIdGenerator;
  settings: AgentSettings;
}>;

/**
 * The agent's pipeline (Template Method): explore, plan, execute, report, always in that order.
 * The language model only proposes the plan; every verdict comes from the browser.
 */
export class TestAgent {
  constructor(private readonly deps: AgentDependencies) {}

  async run(
    request: AgentRequest,
    llm: ILanguageModel,
    context: RunContext,
  ): Promise<'passed' | 'failed'> {
    const started = this.deps.clock.monotonicMs();
    const { settings } = this.deps;
    await context.emit({
      type: 'run.started',
      targetUrl: context.start.href,
      targetLabel: request.targetLabel,
      story: request.story,
      replayed: llm.replayed,
      limits: {
        maxPages: settings.maxPages,
        maxScenarios: settings.maxScenarios,
        maxSteps: settings.maxSteps,
        maxLlmCalls: settings.maxLlmCalls,
      },
    });
    const budgeted = new BudgetedLanguageModel(llm, settings.maxLlmCalls, context.emit);
    const browser = await this.deps.browsers.launch(settings);
    // Stopping a run closes the browser, so a step that is waiting fails at once.
    const stop = (): void => {
      void browser.close().catch(() => undefined); // the finally block below closes it again
    };
    context.signal.addEventListener('abort', stop, { once: true });
    try {
      const { plan, explored } = request.savedPlan
        ? { plan: await this.announce(request.savedPlan, context), explored: new Set<string>() }
        : await this.planFresh(browser, budgeted, request, context);
      const outcomes = await this.execute(browser, plan, { ...context, llm: budgeted, explored });
      await this.report(outcomes, context);
      const status = outcomes.some((outcome) => outcome.status === 'failed') ? 'failed' : 'passed';
      const durationMs = Math.round(this.deps.clock.monotonicMs() - started);
      await context.emit({ type: 'run.finished', status, durationMs });
      return status;
    } finally {
      context.signal.removeEventListener('abort', stop);
      await browser.close();
    }
  }

  private async planFresh(
    browser: IBrowser,
    llm: ILanguageModel,
    request: AgentRequest,
    context: RunContext,
  ): Promise<{ plan: TestPlan; explored: ReadonlySet<string> }> {
    const pages = await this.explore(browser, context);
    const planned = await this.deps.planner.plan(llm, {
      start: context.start,
      story: request.story,
      pages,
    });
    await context.emit({
      type: 'plan.ready',
      plan: planned.plan,
      warnings: [...planned.warnings],
      criteriaInferred: planned.criteriaInferred,
    });
    return { plan: planned.plan, explored: new Set(pages.map((page) => page.url)) };
  }

  /** A saved plan skips exploring and planning; the run still shows it before executing. */
  private async announce(plan: TestPlan, context: RunContext): Promise<TestPlan> {
    await context.emit({ type: 'plan.ready', plan, warnings: [], criteriaInferred: false });
    return plan;
  }

  private async explore(browser: IBrowser, context: RunContext): Promise<readonly PageSnapshot[]> {
    const session = await browser.newSession();
    try {
      const { pages, findings } = await this.deps.explorer.explore(session, context.start, (page) =>
        context.emit({ type: 'explore.page', url: page.url, title: page.title }),
      );
      for (const raw of findings) {
        const finding = Finding.create({
          ...raw,
          id: this.deps.ids.next(),
          scenarioId: null,
          stepId: null,
        });
        await context.emit({ type: 'finding', finding });
      }
      return pages;
    } finally {
      await session.close();
    }
  }

  private async execute(
    browser: IBrowser,
    plan: TestPlan,
    context: ExecutionContext,
  ): Promise<ScenarioOutcome[]> {
    const outcomes: ScenarioOutcome[] = [];
    for (const scenario of plan.scenarios) {
      const session = await browser.newSession();
      try {
        outcomes.push(await this.deps.executor.run(scenario, session, context));
      } finally {
        await session.close();
      }
    }
    return outcomes;
  }

  private async report(outcomes: readonly ScenarioOutcome[], context: RunContext): Promise<void> {
    const bugs = outcomes
      .map((outcome) => this.deps.reporter.report(outcome))
      .filter((bug): bug is BugReport => bug !== null);
    for (const bug of bugs) {
      await context.emit({ type: 'bug.reported', bug });
    }
  }
}
