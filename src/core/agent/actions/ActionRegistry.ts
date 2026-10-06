import type { ActionType } from '../../domain';
import { DomainError } from '../../errors';
import type { IStepAction } from './IStepAction';

/** Looks up the strategy for each allowed action. Unknown actions are never executed. */
export class ActionRegistry {
  private readonly actions: ReadonlyMap<ActionType, IStepAction>;

  constructor(actions: readonly IStepAction[]) {
    const byType = new Map<ActionType, IStepAction>();
    for (const action of actions) {
      if (byType.has(action.type)) {
        throw new DomainError(`The action "${action.type}" is registered twice.`);
      }
      byType.set(action.type, action);
    }
    this.actions = byType;
  }

  has(type: string): type is ActionType {
    return this.actions.has(type as ActionType);
  }

  get(type: ActionType): IStepAction {
    const action = this.actions.get(type);
    if (!action) {
      throw new DomainError(`The action "${type}" is not allowed.`);
    }
    return action;
  }

  types(): readonly ActionType[] {
    return [...this.actions.keys()];
  }
}
