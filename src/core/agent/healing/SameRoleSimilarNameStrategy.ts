import type { Locator } from '../../domain';
import type { AriaEntry } from './ariaEntries';
import type { HealingCandidate, IHealingStrategy } from './IHealingStrategy';
import { rankBySimilarName } from './rankBySimilarName';

/** A renamed control usually keeps its role: "Add to order" button becomes "Add to bag" button. */
export class SameRoleSimilarNameStrategy implements IHealingStrategy {
  readonly name = 'same-role-similar-name';
  readonly because = 'same role, similar name';

  candidates(broken: Locator, entries: readonly AriaEntry[]): HealingCandidate[] {
    if (broken.by !== 'role' || !broken.role) return [];
    const sameRole = entries.filter((entry) => entry.role === broken.role);
    return rankBySimilarName(broken.value, sameRole, (entry) => ({
      ...broken,
      value: entry.name,
      exact: true,
    }));
  }
}
