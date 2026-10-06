import { describe, expect, it } from 'vitest';
import { Locator } from '@/core/domain';
import { DomainError } from '@/core/errors';
import { aRoleLocator } from '../../../fakes/domainBuilders';

describe('Locator.create', () => {
  it('trims values and drops a stray role on non-role locators', () => {
    const locator = Locator.create({
      by: 'label',
      value: '  Cellphone ',
      role: 'textbox',
      exact: true,
      within: null,
    });

    expect(locator).toEqual({
      by: 'label',
      value: 'Cellphone',
      role: null,
      exact: true,
      within: null,
    });
  });

  it('keeps a trimmed container scope', () => {
    const locator = Locator.create(
      aRoleLocator('button', 'Add to order', { within: { role: 'article', hasText: ' Quarter ' } }),
    );

    expect(locator.within).toEqual({ role: 'article', hasText: 'Quarter' });
  });

  it.each([
    ['an empty value', aRoleLocator('button', '   ')],
    ['a role locator without a role', aRoleLocator(null, 'Add to order')],
    [
      'an empty scope',
      aRoleLocator('button', 'Add', { within: { role: 'article', hasText: ' ' } }),
    ],
    ['an unknown role', { ...aRoleLocator('button', 'Add'), role: 'blink' }],
    ['a CSS strategy', { ...aRoleLocator('button', 'Add'), by: 'css' }],
  ])('rejects %s', (_label, input) => {
    expect(() => Locator.create(input)).toThrow(DomainError);
  });

  it('lists every schema problem in the error details', () => {
    try {
      Locator.create({ by: 'xpath' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      const fields = (error as DomainError).details.map((detail) => detail.split(':')[0]);
      expect(fields).toEqual(expect.arrayContaining(['by', 'value', 'role', 'exact', 'within']));
    }
  });
});

describe('Locator.describe', () => {
  it('reads like a person would describe the element', () => {
    expect(Locator.describe(aRoleLocator('button', 'Checkout'))).toBe('button "Checkout"');
    expect(
      Locator.describe(
        aRoleLocator('button', 'Add to order', { within: { role: 'article', hasText: 'Quarter' } }),
      ),
    ).toBe('button "Add to order" in article "Quarter"');
    expect(
      Locator.describe({ by: 'label', value: 'Email', role: null, exact: false, within: null }),
    ).toBe('field labelled "Email"');
    expect(
      Locator.describe({ by: 'placeholder', value: '082', role: null, exact: false, within: null }),
    ).toBe('field with placeholder "082"');
  });
});

describe('Locator.equals', () => {
  it('compares every field, including the scope', () => {
    const a = aRoleLocator('button', 'Add', { within: { role: 'article', hasText: 'Quarter' } });

    expect(Locator.equals(a, { ...a })).toBe(true);
    expect(Locator.equals(a, { ...a, exact: true })).toBe(false);
    expect(Locator.equals(a, { ...a, within: { role: 'article', hasText: 'Full house' } })).toBe(
      false,
    );
    expect(Locator.equals(a, { ...a, within: null })).toBe(false);
  });
});
