import type { PlanStep } from '../../domain';
import type { IStepAction, StepContext } from './IStepAction';
import { requireTarget, requireValue } from './stepOperands';

/** Chooses an option by its visible label. */
export class SelectAction implements IStepAction {
  readonly type = 'select';
  readonly target = 'required';
  readonly value = 'required';

  async execute(step: PlanStep, { session }: StepContext): Promise<void> {
    await session.selectOption(requireTarget(step), requireValue(step));
  }
}
