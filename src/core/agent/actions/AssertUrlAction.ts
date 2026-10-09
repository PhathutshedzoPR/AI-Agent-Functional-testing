import { urlContains, type PlanStep } from '../../domain';
import { AssertionFailedError } from '../../errors';
import type { IStepAction, StepContext } from './IStepAction';
import { requireValue } from './stepOperands';

export class AssertUrlAction implements IStepAction {
  readonly type = 'assertUrl';
  readonly target = 'forbidden';
  readonly value = 'required';

  async execute(step: PlanStep, { session }: StepContext): Promise<void> {
    const expected = requireValue(step);
    const result = await session.pollUrl((url) => urlContains(url, expected));
    if (!result.matched) {
      throw new AssertionFailedError(
        `the URL to contain "${expected}"`,
        `the URL was ${result.actual}`,
      );
    }
  }
}
