import type { AriaRole, Locator } from '@/core/domain';

/**
 * A Locator as the chain of Playwright calls it stands for. The resolver replays the chain on a
 * live page and the spec exporter prints it, so both always agree.
 */
export type LocatorCall =
  | Readonly<{ method: 'getByRole'; role: AriaRole; name: string | null; exact: boolean }>
  | Readonly<{ method: 'filter'; hasText: string }>
  | Readonly<{
      method: 'getByLabel' | 'getByPlaceholder' | 'getByText';
      text: string;
      exact: boolean;
    }>
  | Readonly<{ method: 'getByTestId'; testId: string }>;

const TEXT_METHODS = {
  label: 'getByLabel',
  placeholder: 'getByPlaceholder',
  text: 'getByText',
} as const;

export function toLocatorCalls(locator: Locator): readonly LocatorCall[] {
  const scope: LocatorCall[] = locator.within
    ? [
        { method: 'getByRole', role: locator.within.role, name: null, exact: false },
        { method: 'filter', hasText: locator.within.hasText },
      ]
    : [];
  return [...scope, targetCall(locator)];
}

function targetCall(locator: Locator): LocatorCall {
  switch (locator.by) {
    case 'role':
      // Locator.create guarantees a role for role locators; 'generic' is only a type-level fallback.
      return {
        method: 'getByRole',
        role: locator.role ?? 'generic',
        // A nameless role locator matches by role alone.
        name: locator.value === '' ? null : locator.value,
        exact: locator.exact,
      };
    case 'testId':
      return { method: 'getByTestId', testId: locator.value };
    default:
      return { method: TEXT_METHODS[locator.by], text: locator.value, exact: locator.exact };
  }
}
