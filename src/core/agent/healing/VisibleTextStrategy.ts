import type { Locator } from '../../domain';
import type { AriaEntry } from './ariaEntries';
import type { HealingCandidate, IHealingStrategy } from './IHealingStrategy';
import { rankBySimilarName } from './rankBySimilarName';

/**
 * Last rule: any element whose name resembles the old text, pointed at by role and name, which is
 * more precise than matching raw text.
 */
export class VisibleTextStrategy implements IHealingStrategy {
  readonly name = 'similar-visible-text';
  readonly because = 'an element with similar visible text';

  candidates(broken: Locator, entries: readonly AriaEntry[]): HealingCandidate[] {
    if (broken.by !== 'text' && broken.by !== 'testId') return [];
    return rankBySimilarName(broken.value, entries, (entry) => ({
      by: 'role',
      value: entry.name,
      role: entry.role,
      exact: true,
      within: broken.within,
    }));
  }
}
