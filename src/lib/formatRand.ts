const RAND = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

/** Formats cents as South African rand, e.g. 7000 becomes "R 70,00". */
export function formatRand(cents: number): string {
  return RAND.format(cents / 100);
}
