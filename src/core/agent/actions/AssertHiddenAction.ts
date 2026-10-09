import { Locator, type PlanStep } from '../../domain';
import { AssertionFailedError } from '../../errors';
import type { IStepAction, StepContext } from './IStepAction';
import { requireTarget } from './stepOperands';

export class AssertHiddenAction implements IStepAction {
  readonly type = 'assertHidden';
  readonly target = 'required';
  readonly value = 'forbidden';

  async execute(step: PlanStep, { session }: StepContext): Promise<void> {
    const target = requireTarget(step);
    if (!(await session.waitForHidden(target))) {
      throw new AssertionFailedError(
        `${Locator.describe(target)} to be hidden`,
        'it was still visible',
      );
    }
  }
}
