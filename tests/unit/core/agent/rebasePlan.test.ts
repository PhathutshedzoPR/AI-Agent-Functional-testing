import { describe, expect, it } from 'vitest';
import { rebasePlan } from '@/core/agent';
import { aPlan, aRoleLocator, aScenario, aStep } from '../../../fakes/domainBuilders';
import { SequentialIdGenerator } from '../../../fakes/SequentialIdGenerator';

const from = new URL('http://localhost:3000/demo-shop/stable');
const to = new URL('http://localhost:3000/demo-shop/redesign');

function moved(action: 'navigate' | 'assertUrl' | 'assertText', value: string): string | null {
  const plan = aPlan({
    scenarios: [aScenario({ steps: [aStep({ id: 'old', action, target: null, value })] })],
  });
  return (
    rebasePlan(plan, from, to, new SequentialIdGenerator('new')).scenarios[0]?.steps[0]?.value ??
    null
  );
}

describe('rebasePlan', () => {
  it.each([
    ['navigate', '/demo-shop/stable', '/demo-shop/redesign'],
    ['navigate', '/demo-shop/stable/cart', '/demo-shop/redesign/cart'],
    ['assertUrl', '/demo-shop/stable/specials', '/demo-shop/redesign/specials'],
    [
      'assertUrl',
      'http://localhost:3000/demo-shop/stable/checkout',
      'http://localhost:3000/demo-shop/redesign/checkout',
    ],
  ] as const)('moves %s %s under the new start page', (action, value, expected) => {
    expect(moved(action, value)).toBe(expected);
  });

  it('leaves addresses outside the old start page, and non-address values, alone', () => {
    expect(moved('assertUrl', '/demo-shop/stableish')).toBe('/demo-shop/stableish');
    expect(moved('assertUrl', 'confirmation')).toBe('confirmation');
    expect(moved('assertText', '/demo-shop/stable')).toBe('/demo-shop/stable');
  });

  it('renews every scenario and step id', () => {
    const plan = aPlan({
      scenarios: [
        aScenario({
          id: 'scenario-old',
          steps: [aStep({ id: 'a', action: 'click', target: aRoleLocator('button', 'Go') })],
        }),
      ],
    });
    const rebased = rebasePlan(plan, from, to, new SequentialIdGenerator('new'));

    expect(rebased.scenarios[0]?.id).not.toBe('scenario-old');
    expect(rebased.scenarios[0]?.steps[0]?.id).not.toBe('a');
  });
});
