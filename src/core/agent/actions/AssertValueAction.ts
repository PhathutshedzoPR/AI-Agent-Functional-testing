import { Locator, valueEquals, type PlanStep } from '../../domain';
import { AssertionFailedError } from '../../errors';
import type { IStepAction, StepContext } from './IStepAction';
import { requireTarget, requireValue } from './stepOperands';

export class AssertValueAction implements IStepAction {
  readonly type = 'assertValue';
  readonly target = 'required';
  readonly value = 'required';

  async execute(step: PlanStep, { session }: StepContext): Promise<void> {
    const target = requireTarget(step);
    const expected = requireValue(step);
    const result = await session.pollValue(target, (value) => valueEquals(value, expected));
    if (!result.matched) {
      throw new AssertionFailedError(
        `${Locator.describe(target)} to have the value "${expected}"`,
        `it was "${result.actual}"`,
      );
    }
  }
}
