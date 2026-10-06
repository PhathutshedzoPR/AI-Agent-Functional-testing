import type { ActionType } from './PlanStep';
import { Locator } from './Locator';
import type { PlanStep } from './PlanStep';

const subject = (step: PlanStep): string =>
  step.target ? Locator.describe(step.target) : 'the page';

const SENTENCES: Readonly<Record<ActionType, (step: PlanStep) => string>> = {
  navigate: (step) => `Open ${step.value ?? '/'}`,
  click: (step) => `Click ${subject(step)}`,
  check: (step) => `Tick ${subject(step)}`,
  fill: (step) =>
    step.value ? `Type "${step.value}" into ${subject(step)}` : `Clear ${subject(step)}`,
  select: (step) => `Choose "${step.value ?? ''}" in ${subject(step)}`,
  press: (step) =>
    step.target ? `Press ${step.value ?? ''} in ${subject(step)}` : `Press ${step.value ?? ''}`,
  assertVisible: (step) => `Check that ${subject(step)} is visible`,
  assertHidden: (step) => `Check that ${subject(step)} is hidden`,
  assertText: (step) => `Check that ${subject(step)} shows "${step.value ?? ''}"`,
  assertUrl: (step) => `Check that the URL contains "${step.value ?? ''}"`,
  assertValue: (step) => `Check that ${subject(step)} has the value "${step.value ?? ''}"`,
};

/** A step as one plain sentence, for steps to reproduce, captions and labels. */
export function describeStep(step: PlanStep): string {
  return SENTENCES[step.action](step);
}
