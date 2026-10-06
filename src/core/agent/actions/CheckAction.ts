import type { PlanStep } from '../../domain';
import type { IStepAction, StepContext } from './IStepAction';
import { requireTarget } from './stepOperands';

export class CheckAction implements IStepAction {
  readonly type = 'check';
  readonly target = 'required';
  readonly value = 'forbidden';

  async execute(step: PlanStep, { session }: StepContext): Promise<void> {
    await session.check(requireTarget(step));
  }
}
