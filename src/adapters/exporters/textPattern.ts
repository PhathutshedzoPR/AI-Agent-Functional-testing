import { canonicaliseAmounts, normaliseText } from '@/core/domain';

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\/]/g;
const CANONICAL_AMOUNT = /r(\d+)\.(\d{2})/g;

const escapeRegex = (text: string): string => text.replace(REGEX_SPECIALS, '\\$&');

/** Digits with an optional thousands separator before every third digit from the right. */
function flexibleDigits(digits: string): string {
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  }
  return groups.join(String.raw`[\s,.]?`);
}

/**
 * A case-insensitive regex source that matches what the agent's own text check accepts: any
 * whitespace between words, and rand amounts in any format ("R 70,00", "R70.00", "R70").
 */
export function textPattern(expected: string): string {
  const canonical = canonicaliseAmounts(normaliseText(expected));
  let source = '';
  let last = 0;
  for (const match of canonical.matchAll(CANONICAL_AMOUNT)) {
    const [whole, rands = '0', cents = '00'] = match;
    source += escapeRegex(canonical.slice(last, match.index));
    source += String.raw`R\s?${flexibleDigits(rands)}(?:[.,]${cents})?`;
    last = match.index + whole.length;
  }
  source += escapeRegex(canonical.slice(last));
  return source.replace(/ /g, String.raw`\s+`);
}

/** A regex source matching a URL that contains `fragment` literally. */
export function containsPattern(fragment: string): string {
  return escapeRegex(fragment.trim());
}
