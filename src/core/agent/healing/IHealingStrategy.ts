import type { Locator } from '../../domain';
import type { AriaEntry } from './ariaEntries';

export type HealingCandidate = Readonly<{ locator: Locator; score: number }>;

/**
 * One rule-based way to find a broken locator's replacement in a fresh snapshot (Strategy).
 * Rules never call the LLM; SelfHealer checks every candidate in the real browser.
 */
export interface IHealingStrategy {
  readonly name: string;
  /** Human-readable reason, e.g. "same role, similar name". */
  readonly because: string;
  candidates(broken: Locator, entries: readonly AriaEntry[]): HealingCandidate[];
}
