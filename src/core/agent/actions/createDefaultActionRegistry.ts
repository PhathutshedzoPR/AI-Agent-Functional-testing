import { ActionRegistry } from './ActionRegistry';
import { AssertHiddenAction } from './AssertHiddenAction';
import { AssertTextAction } from './AssertTextAction';
import { AssertUrlAction } from './AssertUrlAction';
import { AssertValueAction } from './AssertValueAction';
import { AssertVisibleAction } from './AssertVisibleAction';
import { CheckAction } from './CheckAction';
import { ClickAction } from './ClickAction';
import { FillAction } from './FillAction';
import { NavigateAction } from './NavigateAction';
import { PressAction } from './PressAction';
import { SelectAction } from './SelectAction';

/** Every allowed action. Adding one means a new class file plus one line here. */
export function createDefaultActionRegistry(): ActionRegistry {
  return new ActionRegistry([
    new NavigateAction(),
    new ClickAction(),
    new CheckAction(),
    new FillAction(),
    new SelectAction(),
    new PressAction(),
    new AssertVisibleAction(),
    new AssertHiddenAction(),
    new AssertTextAction(),
    new AssertUrlAction(),
    new AssertValueAction(),
  ]);
}
