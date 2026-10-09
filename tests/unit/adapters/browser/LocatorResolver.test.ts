import type { Page } from 'playwright';
import { describe, expect, it } from 'vitest';
import { LocatorResolver, toLocatorCalls } from '@/adapters/browser';
import type { Locator } from '@/core/domain';
import { aRoleLocator } from '../../../fakes/domainBuilders';

/** Records the getBy* chain instead of touching a browser. */
class RecordingScope {
  constructor(readonly chain: string[] = []) {}

  private next(call: string): RecordingScope {
    return new RecordingScope([...this.chain, call]);
  }

  getByRole(role: string, options?: object): RecordingScope {
    const args = options ? [role, options] : [role];
    return this.next(`getByRole(${args.map((arg) => JSON.stringify(arg)).join(', ')})`);
  }
  getByLabel(text: string, options: object): RecordingScope {
    return this.next(`getByLabel(${JSON.stringify(text)}, ${JSON.stringify(options)})`);
  }
  getByPlaceholder(text: string, options: object): RecordingScope {
    return this.next(`getByPlaceholder(${JSON.stringify(text)}, ${JSON.stringify(options)})`);
  }
  getByText(text: string, options: object): RecordingScope {
    return this.next(`getByText(${JSON.stringify(text)}, ${JSON.stringify(options)})`);
  }
  getByTestId(id: string): RecordingScope {
    return this.next(`getByTestId(${JSON.stringify(id)})`);
  }
  filter(options: object): RecordingScope {
    return this.next(`filter(${JSON.stringify(options)})`);
  }
}

function chainFor(locator: Locator): string {
  const page = new RecordingScope() as unknown as Page;
  const resolved = new LocatorResolver().resolve(page, locator) as unknown as RecordingScope;
  return resolved.chain.join('.');
}

const plain = (by: Locator['by'], value: string, exact = false): Locator => ({
  by,
  value,
  role: null,
  exact,
  within: null,
});

describe('LocatorResolver', () => {
  it('maps a role locator to getByRole with name and exact', () => {
    expect(chainFor(aRoleLocator('button', 'Checkout', { exact: true }))).toBe(
      'getByRole("button", {"name":"Checkout","exact":true})',
    );
  });

  it('maps label, placeholder, text and test id locators', () => {
    expect(chainFor(plain('label', 'Cellphone'))).toBe('getByLabel("Cellphone", {"exact":false})');
    expect(chainFor(plain('placeholder', '082 000 0000'))).toBe(
      'getByPlaceholder("082 000 0000", {"exact":false})',
    );
    expect(chainFor(plain('text', 'Order confirmed', true))).toBe(
      'getByText("Order confirmed", {"exact":true})',
    );
    expect(chainFor(plain('testId', 'cart-total'))).toBe('getByTestId("cart-total")');
  });

  it('scopes to a container with role and text before finding the target', () => {
    const locator = aRoleLocator('button', 'Add to order', {
      within: { role: 'article', hasText: 'Quarter' },
    });

    expect(chainFor(locator)).toBe(
      'getByRole("article").filter({"hasText":"Quarter"}).getByRole("button", {"name":"Add to order","exact":false})',
    );
  });
});

describe('toLocatorCalls', () => {
  it('describes the same chain as data for the spec exporter', () => {
    expect(
      toLocatorCalls(
        aRoleLocator('link', 'Cart', { within: { role: 'navigation', hasText: 'Menu' } }),
      ),
    ).toEqual([
      { method: 'getByRole', role: 'navigation', name: null, exact: false },
      { method: 'filter', hasText: 'Menu' },
      { method: 'getByRole', role: 'link', name: 'Cart', exact: false },
    ]);
  });
});
