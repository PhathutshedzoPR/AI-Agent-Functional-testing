import { Healing, INTERACTION_ACTIONS, Locator, type PlanStep } from '../domain';
import { AppError, BrowserError } from '../errors';
import type { IBrowserSession, PageSnapshot } from '../ports';
import { HEAL_TEMPERATURE, HealOutputSchema, buildHealPrompt, type HealOutput } from '../prompts';
import { ariaEntries, type IHealingStrategy } from './healing';
import type { ExecutionContext } from './RunContext';
import type { IStepRepairer } from './ScenarioExecutor';

export type SelfHealerOptions = Readonly<{ minConfidence: number; snapshotMaxChars: number }>;

const INTERACTIONS: ReadonlySet<string> = new Set(INTERACTION_ACTIONS);
const MAX_REASON_CHARS = 200;

/**
 * Finds a replacement when an interaction's locator no longer matches exactly one element:
 * rule strategies first, then one LLM call. A candidate is accepted only when it matches exactly
 * one visible element in the real page. Failed assertions are bugs and are never healed.
 */
export class SelfHealer implements IStepRepairer {
  constructor(
    private readonly strategies: readonly IHealingStrategy[],
    private readonly options: SelfHealerOptions,
  ) {}

  async repair(
    step: PlanStep,
    error: AppError,
    session: IBrowserSession,
    context: ExecutionContext,
  ): Promise<Healing | null> {
    const broken = step.target;
    if (!broken || !INTERACTIONS.has(step.action)) return null;
    if (!(error instanceof BrowserError) || !error.isLocatorProblem) return null;

    const page = await session.snapshot(this.options.snapshotMaxChars);
    const where = this.whereNote(page.url, context);
    const byRule = await this.tryRules(broken, page, session);
    if (byRule) {
      return Healing.create({
        from: broken,
        to: byRule.locator,
        method: 'rule',
        strategy: byRule.strategy.name,
        reason: `${Locator.describe(broken)} was not found; used ${Locator.describe(byRule.locator)} (${byRule.strategy.because})${where}.`,
      });
    }
    return this.tryLlm(step, broken, error, page, session, context, where);
  }

  private async tryRules(broken: Locator, page: PageSnapshot, session: IBrowserSession) {
    const entries = ariaEntries(page.aria);
    for (const strategy of this.strategies) {
      for (const candidate of strategy.candidates(broken, entries)) {
        if ((await session.countVisible(candidate.locator)) === 1) {
          return { strategy, locator: candidate.locator };
        }
      }
    }
    return null;
  }

  private async tryLlm(
    step: PlanStep,
    broken: Locator,
    error: BrowserError,
    page: PageSnapshot,
    session: IBrowserSession,
    context: ExecutionContext,
    where: string,
  ): Promise<Healing | null> {
    const { system, prompt } = buildHealPrompt({
      action: step.action,
      intent: step.intent,
      broken,
      problem: error.message,
      page,
      origin: context.start.origin,
    });
    let proposal: HealOutput;
    try {
      proposal = await context.llm.generateObject({
        purpose: 'heal',
        system,
        prompt,
        schema: HealOutputSchema,
        temperature: HEAL_TEMPERATURE,
      });
    } catch (llmError) {
      // No model answer (budget spent, provider down, nothing recorded) means no heal: the step fails.
      if (AppError.is(llmError)) return null;
      throw llmError;
    }
    if (proposal.confidence < this.options.minConfidence) return null;
    let to: Locator;
    try {
      to = Locator.create(proposal.locator);
    } catch {
      return null;
    }
    if (Locator.equals(to, broken) || (await session.countVisible(to)) !== 1) return null;
    const reason = proposal.reason.trim().slice(0, MAX_REASON_CHARS) || 'Suggested by the model.';
    return Healing.create({
      from: broken,
      to,
      method: 'llm',
      strategy: 'llm',
      reason: `${reason}${where}`,
    });
  }

  /** A heal on a page the explorer never read deserves a closer look, so the reason says so. */
  private whereNote(url: string, context: ExecutionContext): string {
    const page = new URL(url);
    page.hash = '';
    return context.explored.has(page.href) ? '' : ' (on a page the explorer never saw)';
  }
}
