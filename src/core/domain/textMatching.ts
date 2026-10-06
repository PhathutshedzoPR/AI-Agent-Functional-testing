/**
 * Deterministic text comparison for assertions and healing. Whitespace (including U+00A0) is
 * collapsed, case is ignored, and rand amounts compare by value: "R 70,00" equals "R70.00".
 */

const WHITESPACE = /\s+/g;
// A rand amount: "R" not glued to a word, optional space, digits with optional thousands groups,
// then optional cents. Bounded quantifiers keep backtracking linear.
const RAND_AMOUNT =
  /(?<![\p{L}\p{N}])r ?(\d{1,3}(?:[ ,.]\d{3}){1,4}|\d{1,9})(?:[.,](\d{2}))?(?!\d)/gu;

export function normaliseText(text: string): string {
  return text.replace(WHITESPACE, ' ').trim().toLowerCase();
}

/** Rewrites every rand amount in already-normalised text as `r<rands>.<cents>`. */
export function canonicaliseAmounts(normalised: string): string {
  return normalised.replace(RAND_AMOUNT, (_match, rands: string, cents: string | undefined) => {
    const whole = Number.parseInt(rands.replace(/[ ,.]/g, ''), 10);
    return `r${whole}.${cents ?? '00'}`;
  });
}

/** Rand amounts in `text`, in cents, in the order they appear. */
export function findRandAmounts(text: string): number[] {
  const canonical = canonicaliseAmounts(normaliseText(text));
  return [...canonical.matchAll(/r(\d+)\.(\d{2})/g)].map(
    ([, rands = '0', cents = '0']) => Number.parseInt(rands, 10) * 100 + Number.parseInt(cents, 10),
  );
}

/** True when `actual` contains `expected` under the normalisation rules above. */
export function textContains(actual: string, expected: string): boolean {
  const wanted = canonicaliseAmounts(normaliseText(expected));
  if (wanted.length === 0) return false;
  return canonicaliseAmounts(normaliseText(actual)).includes(wanted);
}

/** True when two field values are equal after normalisation. */
export function valueEquals(actual: string, expected: string): boolean {
  return normaliseText(actual) === normaliseText(expected);
}

/** True when the URL's path, query or fragment contains `expected`. */
export function urlContains(actualUrl: string, expected: string): boolean {
  const wanted = expected.trim();
  if (wanted.length === 0) return false;
  try {
    const url = new URL(actualUrl);
    return decodeURI(`${url.pathname}${url.search}${url.hash}`).includes(wanted);
  } catch {
    return actualUrl.includes(wanted);
  }
}
