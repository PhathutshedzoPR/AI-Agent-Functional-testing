import { z } from 'zod';
import { DomainError } from '../errors';
import { ARIA_ROLES, INPUT_LIMITS, LOCATOR_STRATEGIES } from './constants';
import { parseDomain } from './parseDomain';

export const AriaRoleSchema = z.enum(ARIA_ROLES);
export type AriaRole = z.infer<typeof AriaRoleSchema>;

export const LocatorStrategySchema = z.enum(LOCATOR_STRATEGIES);
export type LocatorStrategy = z.infer<typeof LocatorStrategySchema>;

export const LocatorScopeSchema = z.object({
  role: AriaRoleSchema.describe('Role of the container, e.g. "article" for one menu item'),
  hasText: z
    .string()
    .describe('Text inside that container that makes it unique, e.g. the item name'),
});

/** A semantic locator. Maps one-to-one to Playwright's getBy* methods; never CSS or XPath. */
export const LocatorSchema = z.object({
  by: LocatorStrategySchema.describe(
    'Prefer "role" with an accessible name, then "label", "placeholder", "text", "testId"',
  ),
  value: z
    .string()
    .max(INPUT_LIMITS.locatorValueMaxChars)
    .describe('Accessible name, label, placeholder, visible text or test id, copied exactly'),
  role: AriaRoleSchema.nullable().describe('ARIA role when "by" is "role", otherwise null'),
  exact: z.boolean().describe('true to match the whole name, false to match a substring'),
  within: LocatorScopeSchema.nullable().describe(
    'Container scope when the same control repeats on the page, otherwise null',
  ),
});

export type Locator = z.infer<typeof LocatorSchema>;

const STRATEGY_NOUNS: Readonly<Record<Exclude<LocatorStrategy, 'role'>, string>> = {
  label: 'field labelled',
  placeholder: 'field with placeholder',
  text: 'text',
  testId: 'test id',
};

export const Locator = {
  /** Validates and normalises a locator. Throws DomainError when it can't be used. */
  create(input: unknown): Locator {
    const parsed = parseDomain(LocatorSchema, input, 'locator');
    const value = parsed.value.trim();
    if (value.length === 0) {
      throw new DomainError('A locator needs a non-empty value.');
    }
    if (parsed.by === 'role' && parsed.role === null) {
      throw new DomainError('A role locator needs a role.');
    }
    const within = parsed.within
      ? { role: parsed.within.role, hasText: parsed.within.hasText.trim() }
      : null;
    if (within?.hasText.length === 0) {
      throw new DomainError('A scoped locator needs text to identify its container.');
    }
    return {
      by: parsed.by,
      value,
      role: parsed.by === 'role' ? parsed.role : null,
      exact: parsed.exact,
      within,
    };
  },

  /** Human-readable form for step captions, reports and healing records. */
  describe(locator: Locator): string {
    const subject =
      locator.by === 'role'
        ? `${locator.role ?? 'element'} "${locator.value}"`
        : `${STRATEGY_NOUNS[locator.by]} "${locator.value}"`;
    return locator.within
      ? `${subject} in ${locator.within.role} "${locator.within.hasText}"`
      : subject;
  },

  equals(a: Locator, b: Locator): boolean {
    return (
      a.by === b.by &&
      a.value === b.value &&
      a.role === b.role &&
      a.exact === b.exact &&
      a.within?.role === b.within?.role &&
      a.within?.hasText === b.within?.hasText
    );
  },
} as const;
