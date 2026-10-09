import { describe, expect, it } from 'vitest';
import { RELEASES, findRelease, shopPath } from '@/app/demo-shop/_config/releases';
import { findMenuItem } from '@/app/demo-shop/_config/menu';
import { isValidCellphone, validateCheckout } from '@/app/demo-shop/_lib/checkoutValidation';
import { addItem, cartTotalCents, itemCount, setQuantity } from '@/app/demo-shop/_lib/pricing';
import { formatRand } from '@/lib/formatRand';

const stable = RELEASES.stable.bugs;
const buggy = RELEASES.buggy.bugs;
const twoQuarters = addItem(addItem([], 'quarter'), 'quarter');

describe('releases', () => {
  it('finds configured releases only', () => {
    expect(findRelease('redesign')?.labels.addToOrder).toBe('Add to bag');
    expect(findRelease('nightly')).toBeNull();
    expect(shopPath('stable')).toBe('/demo-shop/stable');
    expect(shopPath('buggy', 'cart')).toBe('/demo-shop/buggy/cart');
  });

  it('seeds bugs in the buggy release only', () => {
    const anyBug = (id: keyof typeof RELEASES): boolean =>
      Object.values(RELEASES[id].bugs).some(Boolean);

    expect(anyBug('stable')).toBe(false);
    expect(anyBug('redesign')).toBe(false);
    expect(Object.values(buggy).every(Boolean)).toBe(true);
  });
});

describe('cart pricing', () => {
  it('adds items and merges repeats into one line', () => {
    expect(twoQuarters).toEqual([{ itemId: 'quarter', quantity: 2 }]);
    expect(itemCount(addItem(twoQuarters, 'russian'))).toBe(3);
  });

  it('sets and removes quantities', () => {
    expect(setQuantity(twoQuarters, 'quarter', 5)).toEqual([{ itemId: 'quarter', quantity: 5 }]);
    expect(setQuantity(twoQuarters, 'quarter', 0)).toEqual([]);
  });

  it('multiplies by quantity on a correct release', () => {
    expect(cartTotalCents(twoQuarters, stable)).toBe(7_000);
    expect(cartTotalCents([{ itemId: 'gone', quantity: 3 }], stable)).toBe(0);
  });

  it('ignores quantity when the seeded bug is on', () => {
    expect(cartTotalCents(twoQuarters, buggy)).toBe(3_500);
  });

  it('knows its menu', () => {
    expect(findMenuItem('quarter')?.name).toBe('Quarter Kota');
    expect(findMenuItem('pizza')).toBeUndefined();
  });
});

describe('checkout validation', () => {
  const valid = {
    name: 'Thandi Mokoena',
    cellphone: '082 123 4567',
    email: 'thandi@example.co.za',
    address: '12 Vilakazi Street',
    suburb: 'Soweto',
  };

  it('accepts a complete South African order', () => {
    expect(validateCheckout(valid, stable)).toEqual({});
    expect(isValidCellphone('+27821234567', stable)).toBe(true);
  });

  it('names every problem', () => {
    const errors = validateCheckout(
      { name: 'T', cellphone: '12', email: 'nope', address: 'x', suburb: 'Cape Town' },
      stable,
    );

    expect(Object.keys(errors).sort((a, b) => a.localeCompare(b))).toEqual([
      'address',
      'cellphone',
      'email',
      'name',
      'suburb',
    ]);
  });

  it('rejects letters in a cellphone number unless the seeded bug is on', () => {
    expect(isValidCellphone('082abc4567', stable)).toBe(false);
    expect(isValidCellphone('082abc4567', buggy)).toBe(true);
    expect(isValidCellphone('082', buggy)).toBe(false);
  });
});

describe('formatRand', () => {
  it('formats cents the South African way', () => {
    // ICU versions differ on which no-break space they use, so compare the visible characters.
    expect(formatRand(7_000).replace(/\s/g, ' ')).toBe('R 70,00');
    expect(formatRand(123_450).replace(/\s/g, ' ')).toBe('R 1 234,50');
  });
});
