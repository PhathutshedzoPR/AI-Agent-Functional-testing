import { describe, expect, it } from 'vitest';
import { createDefaultActionRegistry, type StepContext } from '@/core/agent/actions';
import type { ActionType, Locator, PlanStep } from '@/core/domain';
import { AssertionFailedError, BrowserError, DomainError, TargetBlockedError } from '@/core/errors';
import { FakeBrowserSession } from '../../../../fakes/FakeBrowserSession';
import { aRoleLocator, aStep } from '../../../../fakes/domainBuilders';

const registry = createDefaultActionRegistry();
const baseUrl = new URL('http://localhost:3000/demo-shop/stable');
const addButton = aRoleLocator('button', 'Add to order', {
  within: { role: 'article', hasText: 'Quarter' },
});
const total = aRoleLocator('status', 'Order total');
const cellphone: Locator = {
  by: 'label',
  value: 'Cellphone',
  role: null,
  exact: false,
  within: null,
};

function run(
  action: ActionType,
  session: FakeBrowserSession,
  overrides: Partial<PlanStep> = {},
): Promise<void> {
  const context: StepContext = { session, baseUrl };
  return registry.get(action).execute(aStep({ action, ...overrides }), context);
}

describe('navigate', () => {
  it('opens a relative path on the target origin', async () => {
    const session = new FakeBrowserSession();
    await run('navigate', session, { target: null, value: '/demo-shop/stable/cart' });

    expect(session.calls).toEqual(['goto http://localhost:3000/demo-shop/stable/cart']);
  });

  it('refuses another origin and malformed URLs', async () => {
    const session = new FakeBrowserSession();

    await expect(
      run('navigate', session, { target: null, value: 'https://evil.example/' }),
    ).rejects.toBeInstanceOf(TargetBlockedError);
    await expect(
      run('navigate', session, { target: null, value: 'https://[::1' }),
    ).rejects.toBeInstanceOf(TargetBlockedError);
    expect(session.calls).toEqual([]);
  });
});

describe('interactions', () => {
  it('click, check, fill, select and press drive the session', async () => {
    const session = new FakeBrowserSession().show(addButton).show(cellphone);

    await run('click', session, { target: addButton });
    await run('check', session, { target: addButton });
    await run('fill', session, { target: cellphone, value: '+27821234567' });
    await run('select', session, { target: cellphone, value: 'Soweto' });
    await run('press', session, { target: cellphone, value: 'Enter' });
    await run('press', session, { target: null, value: 'Tab' });

    expect(session.calls).toEqual([
      'click button "Add to order" in article "Quarter"',
      'check button "Add to order" in article "Quarter"',
      'fill field labelled "Cellphone" +27821234567',
      'select field labelled "Cellphone" Soweto',
      'press field labelled "Cellphone" Enter',
      'press Tab',
    ]);
  });

  it('surfaces locator problems from the browser unchanged', async () => {
    const session = new FakeBrowserSession().show(addButton, { count: 3 });

    await expect(run('click', session, { target: addButton })).rejects.toMatchObject({
      failure: 'ambiguous',
    });
    await expect(run('click', session, { target: total })).rejects.toBeInstanceOf(BrowserError);
  });

  it('refuses keys outside the allowlist', async () => {
    await expect(
      run('press', new FakeBrowserSession(), { target: null, value: 'Control+W' }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('refuses steps that lost a required operand', async () => {
    await expect(run('click', new FakeBrowserSession(), { target: null })).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(
      run('fill', new FakeBrowserSession().show(cellphone), { target: cellphone, value: null }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});

describe('assertVisible and assertHidden', () => {
  it('pass and fail on what the page shows', async () => {
    const session = new FakeBrowserSession().show(total).hide(addButton);

    await expect(run('assertVisible', session, { target: total })).resolves.toBeUndefined();
    await expect(run('assertHidden', session, { target: addButton })).resolves.toBeUndefined();
    await expect(run('assertVisible', session, { target: addButton })).rejects.toThrow(
      'Expected button "Add to order" in article "Quarter" to be visible, but it was not.',
    );
    await expect(run('assertHidden', session, { target: total })).rejects.toBeInstanceOf(
      AssertionFailedError,
    );
  });
});

describe('assertText', () => {
  it('matches text inside the target, ignoring case and spacing', async () => {
    const session = new FakeBrowserSession().show(total, { text: 'Total  R 70,00' });

    await expect(
      run('assertText', session, { target: total, value: 'total r70.00' }),
    ).resolves.toBeUndefined();
  });

  it('reports the amounts actually shown when a rand amount is wrong', async () => {
    const session = new FakeBrowserSession().show(total, { text: 'Total R 35,00' });

    const failure = run('assertText', session, { target: total, value: 'R 70,00' });

    await expect(failure).rejects.toMatchObject({
      expected: 'status "Order total" to contain "R 70,00"',
      actual: 'the amounts shown were R 35,00',
    });
  });

  it('checks the whole page when there is no target and quotes an excerpt', async () => {
    const session = new FakeBrowserSession();
    session.pageText = 'Order confirmed. Delivery to Soweto.';

    await expect(
      run('assertText', session, { target: null, value: 'order confirmed' }),
    ).resolves.toBeUndefined();
    await expect(
      run('assertText', session, { target: null, value: 'Payment failed' }),
    ).rejects.toMatchObject({ actual: 'the text was "Order confirmed. Delivery to Soweto."' });
  });

  it('says when no amount or no text was shown', async () => {
    const session = new FakeBrowserSession();
    session.pageText = 'x'.repeat(400);

    await expect(run('assertText', session, { target: null, value: 'R10' })).rejects.toMatchObject({
      actual: 'no rand amount was shown',
    });
    await expect(run('assertText', session, { target: null, value: 'y' })).rejects.toThrow(
      /\.\.\."/,
    );
    session.pageText = '  ';
    await expect(run('assertText', session, { target: null, value: 'y' })).rejects.toMatchObject({
      actual: 'the text was empty',
    });
  });
});

describe('assertUrl and assertValue', () => {
  it('compare the URL and field values', async () => {
    const session = new FakeBrowserSession('http://localhost:3000/demo-shop/stable/confirmation');
    session.setValue(cellphone, '082 123 4567');

    await expect(
      run('assertUrl', session, { target: null, value: '/confirmation' }),
    ).resolves.toBeUndefined();
    await expect(
      run('assertValue', session, { target: cellphone, value: '082 123 4567' }),
    ).resolves.toBeUndefined();
    await expect(run('assertUrl', session, { target: null, value: '/cart' })).rejects.toThrow(
      'Expected the URL to contain "/cart", but the URL was http://localhost:3000/demo-shop/stable/confirmation.',
    );
    await expect(
      run('assertValue', session, { target: cellphone, value: '' + 'abc' }),
    ).rejects.toMatchObject({ actual: 'it was "082 123 4567"' });
  });
});
