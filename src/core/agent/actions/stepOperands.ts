import { findRandAmounts, type Locator, type PlanStep } from '../../domain';
import { DomainError } from '../../errors';

const EXCERPT_CHARS = 160;
const RAND = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

export function requireTarget(step: PlanStep): Locator {
  if (!step.target) {
    throw new DomainError(`The ${step.action} step "${step.intent}" has no target.`);
  }
  return step.target;
}

export function requireValue(step: PlanStep): string {
  if (step.value === null) {
    throw new DomainError(`The ${step.action} step "${step.intent}" has no value.`);
  }
  return step.value;
}

/**
 * Describes what the page actually showed, briefly. When the expectation is a rand amount, the
 * amounts on the page are what matter, so those are listed instead of an excerpt.
 */
export function describeActualText(actual: string, expected: string): string {
  if (findRandAmounts(expected).length > 0) {
    const amounts = [...new Set(findRandAmounts(actual))].map((cents) => RAND.format(cents / 100));
    return amounts.length > 0
      ? `the amounts shown were ${amounts.join(', ')}`
      : 'no rand amount was shown';
  }
  const text = actual.replace(/\s+/g, ' ').trim();
  if (text.length === 0) return 'the text was empty';
  const excerpt = text.length > EXCERPT_CHARS ? `${text.slice(0, EXCERPT_CHARS)}...` : text;
  return `the text was "${excerpt}"`;
}
