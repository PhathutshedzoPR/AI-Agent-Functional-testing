import type { PlanStep } from '../../domain';
import type { IStepAction, StepContext } from './IStepAction';
import { requireTarget, requireValue } from './stepOperands';

export class FillAction implements IStepAction {
  readonly type = 'fill';
  readonly target = 'required';
  readonly value = 'required';

  async execute(step: PlanStep, { session }: StepContext): Promise<void> {
    await session.fill(requireTarget(step), requireValue(step));
  }
}
