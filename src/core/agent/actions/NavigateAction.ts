import type { PlanStep } from '../../domain';
import { TargetBlockedError } from '../../errors';
import type { IStepAction, StepContext } from './IStepAction';
import { requireValue } from './stepOperands';

/** Opens a path or URL on the target's own origin. */
export class NavigateAction implements IStepAction {
  readonly type = 'navigate';
  readonly target = 'forbidden';
  readonly value = 'required';

  /** Resolves `value` against the start URL, refusing anything on another origin. */
  static resolve(value: string, baseUrl: URL): URL {
    let url: URL;
    try {
      url = new URL(value.trim(), baseUrl);
    } catch {
      throw new TargetBlockedError('the navigation target is not a valid URL');
    }
    if (url.origin !== baseUrl.origin) {
      throw new TargetBlockedError('navigation must stay on the target site');
    }
    return url;
  }

  async execute(step: PlanStep, { session, baseUrl }: StepContext): Promise<void> {
    await session.goto(NavigateAction.resolve(requireValue(step), baseUrl).href);
  }
}
