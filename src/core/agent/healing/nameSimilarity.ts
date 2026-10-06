import { normaliseText } from '../../domain';

/** Below this, two names are not considered the same control renamed. */
export const MIN_NAME_SIMILARITY = 0.5;

const words = (text: string): Set<string> =>
  new Set(normaliseText(text).split(' ').filter(Boolean));

/**
 * How alike two accessible names are, from 0 to 1: identical after normalisation is 1, one
 * containing the other is 0.9, otherwise the share of words they have in common.
 */
export function nameSimilarity(a: string, b: string): number {
  const left = normaliseText(a);
  const right = normaliseText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.9;
  const leftWords = words(left);
  const rightWords = words(right);
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  return shared / new Set([...leftWords, ...rightWords]).size;
}
