import type { PlanStep } from '../../domain';
import { DomainError } from '../../errors';
import type { IStepAction, StepContext } from './IStepAction';
import { requireValue } from './stepOperands';

/** Keys the agent may press. Anything else (shortcuts, modifiers) is refused. */
export const ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'Enter',
  'Tab',
  'Escape',
  'Space',
  'Backspace',
  'Delete',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

/** Presses one key, on the target when given, otherwise on whatever has focus. */
export class PressAction implements IStepAction {
  readonly type = 'press';
  readonly target = 'optional';
  readonly value = 'required';

  async execute(step: PlanStep, { session }: StepContext): Promise<void> {
    const key = requireValue(step);
    if (!ALLOWED_KEYS.has(key)) {
      throw new DomainError(`The key "${key}" is not on the allowed list.`);
    }
    await session.press(step.target, key);
  }
}
