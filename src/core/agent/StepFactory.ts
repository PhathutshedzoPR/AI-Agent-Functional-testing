import { Locator, PlanStep } from '../domain';
import { AppError, DomainError } from '../errors';
import type { IIdGenerator } from '../ports';
import { ALLOWED_KEYS, NavigateAction, type ActionRegistry, type IStepAction } from './actions';

/** A step as the planner proposed it, before any of our rules are applied. */
export type RawPlanStep = Readonly<{
  action: string;
  target: unknown;
  value: string | null;
  intent: string;
}>;

export type StepBuildResult =
  Readonly<{ ok: true; step: PlanStep }> | Readonly<{ ok: false; warning: string }>;

/**
 * Turns proposed steps into executable ones, enforcing the action table from CLAUDE.md section 6.
 * Operands an action doesn't take are dropped; a missing or invalid required operand rejects the
 * step with a warning. Rejected steps are shown to the user and never executed.
 */
export class StepFactory {
  constructor(
    private readonly registry: ActionRegistry,
    private readonly ids: IIdGenerator,
  ) {}

  build(raw: RawPlanStep, baseUrl: URL): StepBuildResult {
    const label = raw.intent.trim() || raw.action;
    if (!this.registry.has(raw.action)) {
      return { ok: false, warning: `Dropped step "${label}": "${raw.action}" is not allowed.` };
    }
    const action = this.registry.get(raw.action);
    try {
      const target = this.resolveTarget(action, raw.target);
      const value = this.resolveValue(action, raw.value);
      this.checkActionRules(action, value, baseUrl);
      const step = PlanStep.create({
        id: this.ids.next(),
        action: action.type,
        target,
        value,
        intent: raw.intent,
      });
      return { ok: true, step };
    } catch (error) {
      if (error instanceof AppError) {
        return { ok: false, warning: `Dropped step "${label}": ${error.message}` };
      }
      throw error;
    }
  }

  private resolveTarget(action: IStepAction, raw: unknown): Locator | null {
    if (action.target === 'forbidden' || (action.target === 'optional' && raw == null)) {
      return null;
    }
    if (raw == null) {
      throw new DomainError(`a ${action.type} step needs a target.`);
    }
    return Locator.create(raw);
  }

  private resolveValue(action: IStepAction, raw: string | null): string | null {
    if (action.value === 'forbidden') return null;
    // Typing an empty string is a real test (clearing a field); every other value must say something.
    if (raw === null || (action.type !== 'fill' && raw.trim().length === 0)) {
      throw new DomainError(`a ${action.type} step needs a value.`);
    }
    return action.type === 'fill' ? raw : raw.trim();
  }

  private checkActionRules(action: IStepAction, value: string | null, baseUrl: URL): void {
    if (action.type === 'navigate' && value !== null) {
      NavigateAction.resolve(value, baseUrl);
    }
    if (action.type === 'press' && value !== null && !ALLOWED_KEYS.has(value)) {
      throw new DomainError(`the key "${value}" is not on the allowed list.`);
    }
  }
}
