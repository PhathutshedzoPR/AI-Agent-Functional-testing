import { describe, expect, it } from 'vitest';
import {
  FormFieldStrategy,
  SameRoleSimilarNameStrategy,
  SelfHealer,
  VisibleTextStrategy,
  ariaEntries,
  createDefaultHealingStrategies,
  nameSimilarity,
} from '@/core/agent';
import type { Locator } from '@/core/domain';
import { AssertionFailedError, BrowserError, LlmError } from '@/core/errors';
import { FakeBrowserSession } from '../../../fakes/FakeBrowserSession';
import { FakeLanguageModel } from '../../../fakes/FakeLanguageModel';
import { aRoleLocator, aStep } from '../../../fakes/domainBuilders';
import { recordingContext } from '../../../fakes/recordingContext';

const REDESIGN = 'http://localhost:3000/demo-shop/redesign';
const MENU_ARIA = [
  '- heading "Our kotas" [level=1]',
  '- article:',
  '  - heading "Quarter Kota" [level=2]',
  '  - button "Add to bag"',
  '- article:',
  '  - heading "Russian Kota" [level=2]',
  '  - button "Add to bag"',
  '- link "Cart":',
  '  - /url: /demo-shop/redesign/cart',
  '- textbox "Mobile number"',
  '- button "Say \\"hi\\""',
].join('\n');
const scope = { role: 'article' as const, hasText: 'Quarter Kota' };
const oldAdd = aRoleLocator('button', 'Add to order', { within: scope });
const newAdd: Locator = { ...oldAdd, value: 'Add to bag', exact: true };
const label = (value: string): Locator => ({
  by: 'label',
  value,
  role: null,
  exact: false,
  within: null,
});
const notFound = new BrowserError(
  'not-found',
  'No visible button "Add to order" in article "Quarter Kota" on the page',
);

function redesignPage(): FakeBrowserSession {
  const session = new FakeBrowserSession(REDESIGN);
  session.aria = MENU_ARIA;
  return session;
}

function healer(minConfidence = 0.7): SelfHealer {
  return new SelfHealer(createDefaultHealingStrategies(), {
    minConfidence,
    snapshotMaxChars: 5_000,
  });
}

describe('ariaEntries and nameSimilarity', () => {
  it('reads named elements, unescaping quotes and skipping unknown roles', () => {
    const entries = ariaEntries(`${MENU_ARIA}\n- blink "nope"\n- article:`);

    expect(entries).toContainEqual({ role: 'button', name: 'Add to bag' });
    expect(entries).toContainEqual({ role: 'button', name: 'Say "hi"' });
    expect(entries.some((entry) => (entry.role as string) === 'blink')).toBe(false);
  });

  it('scores renamed controls', () => {
    expect(nameSimilarity('Add to order', 'add  to ORDER')).toBe(1);
    expect(nameSimilarity('Cart', 'Cart (2)')).toBeCloseTo(0.9);
    expect(nameSimilarity('Add to order', 'Add to bag')).toBeCloseTo(0.5);
    expect(nameSimilarity('Checkout', 'Proceed to payment')).toBe(0);
    expect(nameSimilarity('', 'x')).toBe(0);
  });
});

describe('rule strategies', () => {
  const entries = ariaEntries(MENU_ARIA);

  it('same role, similar name keeps the container scope', () => {
    const [best] = new SameRoleSimilarNameStrategy().candidates(oldAdd, entries);

    expect(best?.locator).toEqual(newAdd);
    expect(new SameRoleSimilarNameStrategy().candidates(label('x'), entries)).toEqual([]);
  });

  it('form fields match by similar label', () => {
    const [best] = new FormFieldStrategy().candidates(label('Mobile'), entries);

    expect(best?.locator).toMatchObject({ by: 'label', value: 'Mobile number' });
    expect(new FormFieldStrategy().candidates(oldAdd, entries)).toEqual([]);
  });

  it('visible text falls back to role and name', () => {
    const text: Locator = { by: 'text', value: 'Russian', role: null, exact: false, within: null };
    const names = new VisibleTextStrategy().candidates(text, entries).map((c) => c.locator.value);

    expect(names).toContain('Russian Kota');
    expect(new VisibleTextStrategy().candidates(oldAdd, entries)).toEqual([]);
  });
});

describe('SelfHealer', () => {
  const click = aStep({ action: 'click', target: oldAdd, intent: 'Add a Quarter Kota' });

  it('heals a renamed button with a rule, checked against the real page', async () => {
    const session = redesignPage().show(newAdd);
    const context = recordingContext({ explored: new Set([REDESIGN]) });

    const healing = await healer().repair(click, notFound, session, context);

    expect(healing).toEqual({
      from: oldAdd,
      to: newAdd,
      method: 'rule',
      strategy: 'same-role-similar-name',
      reason:
        'button "Add to order" in article "Quarter Kota" was not found; used button "Add to bag" in article "Quarter Kota" (same role, similar name).',
    });
  });

  it('says when the page was never explored', async () => {
    const healing = await healer().repair(
      click,
      notFound,
      redesignPage().show(newAdd),
      recordingContext(),
    );

    expect(healing?.reason).toMatch(/on a page the explorer never saw\)\.$/);
  });

  it('asks the model once when no rule finds exactly one element', async () => {
    const checkout = aRoleLocator('link', 'Checkout');
    const pay = aRoleLocator('link', 'Proceed to payment');
    const llm = new FakeLanguageModel().answer('heal', {
      locator: pay,
      confidence: 0.92,
      reason: 'The checkout link is now called "Proceed to payment".',
    });
    const session = redesignPage().show(pay);

    const healing = await healer().repair(
      aStep({ action: 'click', target: checkout, intent: 'Go to checkout' }),
      new BrowserError('not-found', 'No visible link "Checkout" on the page'),
      session,
      recordingContext({ llm }),
    );

    expect(healing).toMatchObject({ method: 'llm', to: pay });
    expect(healing?.reason).toContain('Proceed to payment');
    expect(llm.requests).toHaveLength(1);
    expect(llm.requests[0]).toMatchObject({ purpose: 'heal', temperature: 0 });
    expect(llm.requests[0]?.prompt).toContain('path="/demo-shop/redesign"');
  });

  it.each([
    ['too unsure', { locator: aRoleLocator('link', 'Cart'), confidence: 0.4, reason: 'guess' }],
    [
      'the same locator',
      { locator: aRoleLocator('link', 'Checkout'), confidence: 0.9, reason: 'x' },
    ],
    ['no single match', { locator: aRoleLocator('link', 'Nowhere'), confidence: 0.9, reason: 'x' }],
    ['an invalid locator', { locator: aRoleLocator(null, 'Cart'), confidence: 0.9, reason: 'x' }],
  ])('rejects a model answer that is %s', async (_label, answer) => {
    const llm = new FakeLanguageModel().answer('heal', answer);

    const healing = await healer().repair(
      aStep({ action: 'click', target: aRoleLocator('link', 'Checkout') }),
      new BrowserError('not-found', 'gone'),
      redesignPage().show(aRoleLocator('link', 'Cart')),
      recordingContext({ llm }),
    );

    expect(healing).toBeNull();
  });

  it('gives up quietly when the model is unavailable, but not on programming errors', async () => {
    const step = aStep({ action: 'click', target: aRoleLocator('link', 'Checkout') });
    const failing = new FakeLanguageModel().answer('heal', () => {
      throw new LlmError('budget spent');
    });
    const buggy = new FakeLanguageModel().answer('heal', () => {
      throw new TypeError('bug');
    });

    await expect(
      healer().repair(step, notFound, redesignPage(), recordingContext({ llm: failing })),
    ).resolves.toBeNull();
    await expect(
      healer().repair(step, notFound, redesignPage(), recordingContext({ llm: buggy })),
    ).rejects.toBeInstanceOf(TypeError);
  });

  it.each([
    ['an assertion step', aStep({ action: 'assertVisible', target: oldAdd }), notFound],
    ['a step without a target', aStep({ action: 'press', target: null, value: 'Enter' }), notFound],
    ['a failed assertion', click, new AssertionFailedError('x', 'y')],
    ['a timeout', click, new BrowserError('timeout', 'slow')],
  ])('never heals %s', async (_label, step, error) => {
    const llm = new FakeLanguageModel();

    expect(
      await healer().repair(step, error, redesignPage().show(newAdd), recordingContext({ llm })),
    ).toBeNull();
    expect(llm.requests).toHaveLength(0);
  });
});
