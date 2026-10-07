import { describe, expect, it } from 'vitest';
import { traceCriteria, type ScenarioState, type ScenarioView } from '@/core/domain';
import { aScenario } from '../../../fakes/domainBuilders';

function scenario(id: string, criterion: string | null, state: ScenarioState): ScenarioView {
  return { ...aScenario({ id, criterion }), state, steps: [] };
}

const ORDER = 'The total includes every kota in the cart';
const PHONE = 'Checkout rejects a cellphone number with letters';

describe('traceCriteria', () => {
  it('lists every criterion in story order with the scenarios that check it', () => {
    const rows = traceCriteria({
      criteria: [ORDER, PHONE],
      scenarios: [scenario('s1', PHONE, 'passed'), scenario('s2', ORDER, 'passed')],
    });

    expect(rows.map((row) => [row.criterion, row.verdict, row.scenarios.map((s) => s.id)])).toEqual(
      [
        [ORDER, 'passed', ['s2']],
        [PHONE, 'passed', ['s1']],
      ],
    );
  });

  it('matches the planner copy despite case and a trailing full stop', () => {
    const rows = traceCriteria({
      criteria: [ORDER],
      scenarios: [scenario('s1', `${ORDER.toUpperCase()}.`, 'passed')],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.scenarios).toHaveLength(1);
  });

  it('takes the worst result: failed, then running, pending, healed, passed', () => {
    const verdict = (...states: ScenarioState[]) =>
      traceCriteria({
        criteria: [ORDER],
        scenarios: states.map((state, i) => scenario(`s${i}`, ORDER, state)),
      })[0]?.verdict;

    expect(verdict('passed', 'failed', 'running')).toBe('failed');
    expect(verdict('passed', 'running', 'pending')).toBe('running');
    expect(verdict('healed', 'pending')).toBe('pending');
    expect(verdict('passed', 'healed')).toBe('healed');
    expect(verdict('passed', 'passed')).toBe('passed');
  });

  it('keeps criteria nobody tested, and groups unlinked scenarios last', () => {
    const rows = traceCriteria({
      criteria: [ORDER],
      scenarios: [
        scenario('s1', null, 'failed'),
        scenario('s2', 'A criterion of its own', 'passed'),
      ],
    });

    expect(rows.map((row) => [row.criterion, row.verdict])).toEqual([
      [ORDER, 'untested'],
      ['A criterion of its own', 'passed'],
      [null, 'failed'],
    ]);
  });
});
