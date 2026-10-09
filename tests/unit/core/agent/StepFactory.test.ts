import { describe, expect, it } from 'vitest';
import { StepFactory, type RawPlanStep } from '@/core/agent/StepFactory';
import {
  ActionRegistry,
  ClickAction,
  createDefaultActionRegistry,
  type IStepAction,
} from '@/core/agent/actions';
import { DomainError } from '@/core/errors';
import { SequentialIdGenerator } from '../../../fakes/SequentialIdGenerator';
import { aRoleLocator } from '../../../fakes/domainBuilders';

const baseUrl = new URL('http://localhost:3000/demo-shop/stable');
const button = aRoleLocator('button', 'Checkout');

function factory(): StepFactory {
  return new StepFactory(createDefaultActionRegistry(), new SequentialIdGenerator('step'));
}

function raw(overrides: Partial<RawPlanStep>): RawPlanStep {
  return { action: 'click', target: button, value: null, intent: 'Go to checkout', ...overrides };
}

describe('StepFactory', () => {
  it('builds a valid step with a fresh id', () => {
    const result = factory().build(raw({}), baseUrl);

    expect(result).toEqual({
      ok: true,
      step: {
        id: 'step-1',
        action: 'click',
        target: button,
        value: null,
        intent: 'Go to checkout',
      },
    });
  });

  it('drops operands an action does not take', () => {
    const navigate = factory().build(
      raw({ action: 'navigate', target: button, value: ' /demo-shop/stable/cart ' }),
      baseUrl,
    );
    const click = factory().build(raw({ value: 'ignored' }), baseUrl);

    expect(navigate.ok && navigate.step).toMatchObject({
      target: null,
      value: '/demo-shop/stable/cart',
    });
    expect(click.ok && click.step.value).toBeNull();
  });

  it('keeps an optional target when given and allows typing an empty string', () => {
    const assertText = factory().build(
      raw({ action: 'assertText', target: button, value: 'Checkout' }),
      baseUrl,
    );
    const pageText = factory().build(
      raw({ action: 'assertText', target: null, value: 'Thanks' }),
      baseUrl,
    );
    const clear = factory().build(
      raw({ action: 'fill', target: aRoleLocator('textbox', 'Name'), value: '' }),
      baseUrl,
    );

    expect(assertText.ok && assertText.step.target).toEqual(button);
    expect(pageText.ok && pageText.step.target).toBeNull();
    expect(clear.ok && clear.step.value).toBe('');
  });

  it.each<[string, Partial<RawPlanStep>, RegExp]>([
    ['an unknown action', { action: 'evaluate' }, /"evaluate" is not allowed/],
    ['a click without a target', { target: null }, /needs a target/],
    ['a fill without a value', { action: 'fill', value: null }, /needs a value/],
    ['a blank assertion', { action: 'assertUrl', target: null, value: '  ' }, /needs a value/],
    ['an invalid locator', { target: { by: 'css', value: '#buy' } }, /Invalid locator/],
    [
      'navigation to another site',
      { action: 'navigate', target: null, value: 'https://evil.example/' },
      /stay on the target site/,
    ],
    ['a key outside the allowlist', { action: 'press', target: null, value: 'F12' }, /"F12"/],
    ['a step without an intent', { intent: '  ' }, /needs an intent/],
  ])('rejects %s with a warning', (_label, overrides, warning) => {
    const result = factory().build(raw(overrides), baseUrl);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.warning).toMatch(warning);
  });

  it('names the step in its warning', () => {
    const result = factory().build(raw({ target: null, intent: 'Open the cart' }), baseUrl);

    expect(!result.ok && result.warning).toBe(
      'Dropped step "Open the cart": a click step needs a target.',
    );
  });

  it('lets unexpected errors through', () => {
    const exploding: IStepAction = {
      type: 'click',
      target: 'required',
      value: 'forbidden',
      execute: () => Promise.resolve(),
    };
    const broken = new StepFactory(new ActionRegistry([exploding]), {
      next: () => {
        throw new TypeError('id source down');
      },
    });

    expect(() => broken.build(raw({}), baseUrl)).toThrow(TypeError);
  });
});

describe('ActionRegistry', () => {
  it('lists every allowed action', () => {
    expect(createDefaultActionRegistry().types()).toHaveLength(11);
  });

  it('refuses duplicate registrations and unknown lookups', () => {
    expect(() => new ActionRegistry([new ClickAction(), new ClickAction()])).toThrow(DomainError);
    expect(() => new ActionRegistry([]).get('click')).toThrow(/not allowed/);
  });
});
