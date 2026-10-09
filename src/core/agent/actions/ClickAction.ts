import type { PlanStep } from '../../domain';
import type { IStepAction, StepContext } from './IStepAction';
import { requireTarget } from './stepOperands';

export class ClickAction implements IStepAction {
  readonly type = 'click';
  readonly target = 'required';
  readonly value = 'forbidden';

  async execute(step: PlanStep, { session }: StepContext): Promise<void> {
    await session.click(requireTarget(step));
  }
}
