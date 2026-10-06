import type { ActionType, PlanStep } from '../../domain';
import type { IBrowserSession } from '../../ports';

export type OperandRule = 'required' | 'optional' | 'forbidden';

export type StepContext = Readonly<{
  session: IBrowserSession;
  /** The run's start URL. Navigation may not leave its origin. */
  baseUrl: URL;
}>;

/**
 * One allowed step action (Strategy). Declares which operands it takes, so StepFactory can
 * enforce the action table, and runs the step against a real browser session.
 * Throws AssertionFailedError when a check does not hold and BrowserError when the page can't
 * be driven.
 */
export interface IStepAction {
  readonly type: ActionType;
  readonly target: OperandRule;
  readonly value: Exclude<OperandRule, 'optional'>;
  execute(step: PlanStep, context: StepContext): Promise<void>;
}
