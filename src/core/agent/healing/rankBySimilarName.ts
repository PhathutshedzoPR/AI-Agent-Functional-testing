import type { AriaEntry } from './ariaEntries';
import type { HealingCandidate } from './IHealingStrategy';
import { MIN_NAME_SIMILARITY, nameSimilarity } from './nameSimilarity';
import type { Locator } from '../../domain';

/**
 * Turns snapshot entries whose names resemble `name` into candidates, best first. Shared by the
 * strategies so each only decides which entries qualify and how to point at them.
 */
export function rankBySimilarName(
  name: string,
  entries: readonly AriaEntry[],
  toLocator: (entry: AriaEntry) => Locator,
): HealingCandidate[] {
  const seen = new Set<string>();
  return entries
    .filter((entry) => entry.name !== name)
    .map((entry) => ({ entry, score: nameSimilarity(name, entry.name) }))
    .filter(({ score }) => score >= MIN_NAME_SIMILARITY)
    .sort((a, b) => b.score - a.score)
    .filter(({ entry }) => {
      const key = `${entry.role}|${entry.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ entry, score }) => ({ locator: toLocator(entry), score }));
}
