import { describe, expect, it } from 'vitest';
import {
  canonicaliseAmounts,
  findRandAmounts,
  normaliseText,
  textContains,
  urlContains,
  valueEquals,
} from '@/core/domain';

describe('normaliseText', () => {
  it('collapses whitespace including non-breaking spaces and lowercases', () => {
    expect(normaliseText('  Order  total \n R 70,00 ')).toBe('order total r 70,00');
  });
});

describe('canonicaliseAmounts', () => {
  it.each([
    ['r 70,00', 'r70.00'],
    ['r70.00', 'r70.00'],
    ['r70', 'r70.00'],
    ['r 1 234,50', 'r1234.50'],
    ['r1,234.50', 'r1234.50'],
    ['total r 140,00 incl', 'total r140.00 incl'],
  ])('rewrites %s as %s', (input, expected) => {
    expect(canonicaliseAmounts(input)).toBe(expected);
  });

  it('leaves words that merely contain an r alone', () => {
    expect(canonicaliseAmounts('order 2 kotas')).toBe('order 2 kotas');
    expect(canonicaliseAmounts('for 70 people')).toBe('for 70 people');
  });
});

describe('findRandAmounts', () => {
  it('returns amounts in cents in order', () => {
    expect(findRandAmounts('Subtotal R 70,00 Delivery R 25,00')).toEqual([7000, 2500]);
  });
});

describe('textContains', () => {
  it('matches case-insensitively as a substring', () => {
    expect(textContains('Thanks! Your ORDER is confirmed.', 'order is confirmed')).toBe(true);
  });

  it('compares rand amounts by value, not formatting', () => {
    expect(textContains('Total: R 70,00', 'R70.00')).toBe(true);
    expect(textContains('Total: R 70,00', 'Total: R70')).toBe(true);
    expect(textContains('Total: R 35,00', 'R70.00')).toBe(false);
  });

  it('never matches an empty expectation', () => {
    expect(textContains('anything', '  ')).toBe(false);
  });
});

describe('valueEquals', () => {
  it('compares whole values after normalisation', () => {
    expect(valueEquals(' 082 123 4567 ', '082 123  4567')).toBe(true);
    expect(valueEquals('082abc', '082')).toBe(false);
  });
});

describe('urlContains', () => {
  it('checks the path, query and fragment', () => {
    const url = 'http://localhost:3000/demo-shop/stable/confirmation?order=KX-1#top';

    expect(urlContains(url, '/confirmation')).toBe(true);
    expect(urlContains(url, 'order=KX-1')).toBe(true);
    expect(urlContains(url, 'localhost')).toBe(false);
    expect(urlContains(url, ' ')).toBe(false);
  });

  it('falls back to a plain substring check for non-URLs', () => {
    expect(urlContains('about:blank', 'blank')).toBe(true);
  });
});
