import { Locator, textContains, type PlanStep } from '../../domain';
import { AssertionFailedError } from '../../errors';
import type { IStepAction, StepContext } from './IStepAction';
import { describeActualText, requireValue } from './stepOperands';

/** Checks that the target (or the whole page) contains the expected text. */
export class AssertTextAction implements IStepAction {
  readonly type = 'assertText';
  readonly target = 'optional';
  readonly value = 'required';

  async execute(step: PlanStep, { session }: StepContext): Promise<void> {
    const expected = requireValue(step);
    const result = await session.pollText(step.target, (text) => textContains(text, expected));
    if (!result.matched) {
      const where = step.target ? Locator.describe(step.target) : 'the page';
      throw new AssertionFailedError(
        `${where} to contain "${expected}"`,
        describeActualText(result.actual, expected),
      );
    }
  }
}
