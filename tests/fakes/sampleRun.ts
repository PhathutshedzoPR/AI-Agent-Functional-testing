import { projectRun, type RunEventPayload, type RunView } from '@/core/domain';
import { aBug, aPlan, aRoleLocator, aScenario, aStep, aStepResult } from './domainBuilders';
import { stamp } from './eventBuilders';

const add = aRoleLocator('button', 'Add to order', {
  within: { role: 'article', hasText: 'Quarter Kota' },
});
const bag = { ...add, value: 'Add to bag', exact: true };

/** A finished buggy run: one healed step, one failed check, one skipped step and a bug. */
export function sampleRunEvents(
  overrides: { label?: string; pageText?: string } = {},
): RunEventPayload[] {
  const plan = aPlan({
    summary: 'Order flow',
    scenarios: [
      aScenario({
        id: 'sc1',
        title: overrides.pageText ?? 'Order two <kotas> & "check" out',
        steps: [
          aStep({
            id: 'a',
            action: 'navigate',
            target: null,
            value: '/demo-shop/buggy',
            intent: 'Open',
          }),
          aStep({ id: 'b', action: 'click', target: add, intent: 'Add a kota' }),
          aStep({
            id: 'c',
            action: 'assertText',
            target: null,
            value: 'Total R 70,00',
            intent: 'Total',
          }),
          aStep({
            id: 'd',
            action: 'fill',
            target: { by: 'label', value: 'Full name', role: null, exact: false, within: null },
            value: 'Thandi',
            intent: 'Name',
          }),
        ],
      }),
      aScenario({ id: 'sc2', title: 'Never ran', kind: 'edge', steps: [aStep({ id: 'e' })] }),
    ],
  });
  return [
    {
      type: 'run.started',
      targetUrl: 'http://localhost:3000/demo-shop/buggy',
      targetLabel: overrides.label ?? 'Kota Express (buggy)',
      scan: false,
      device: 'desktop',
      story: 'Order two kotas',
      replayed: true,
      limits: { maxPages: 5, maxScenarios: 4, maxSteps: 12, maxLlmCalls: 12 },
    },
    { type: 'llm.called', purpose: 'plan', used: 1, max: 12 },
    {
      type: 'plan.ready',
      plan,
      warnings: [],
      criteria: ['Total is right'],
      criteriaInferred: false,
    },
    { type: 'scenario.started', scenarioId: 'sc1' },
    {
      type: 'step.finished',
      result: aStepResult({ scenarioId: 'sc1', stepId: 'a', durationMs: 900 }),
    },
    {
      type: 'step.finished',
      result: aStepResult({
        scenarioId: 'sc1',
        stepId: 'b',
        status: 'healed',
        healing: {
          from: add,
          to: bag,
          method: 'rule',
          strategy: 'same-role-similar-name',
          reason: 'Renamed',
        },
      }),
    },
    {
      type: 'step.finished',
      result: aStepResult({
        scenarioId: 'sc1',
        stepId: 'c',
        status: 'failed',
        error: 'Expected the page to contain "Total R 70,00", but the amounts shown were R 35,00.',
      }),
    },
    {
      type: 'step.finished',
      result: aStepResult({
        scenarioId: 'sc1',
        stepId: 'd',
        status: 'skipped',
        screenshot: false,
        durationMs: 0,
        url: null,
      }),
    },
    { type: 'scenario.finished', scenarioId: 'sc1', status: 'failed' },
    {
      type: 'finding',
      finding: {
        id: 'f1',
        kind: 'broken-link',
        message: 'http://localhost:3000/demo-shop/buggy/specials returned 404',
        url: '/specials',
        status: 404,
        scenarioId: null,
        stepId: null,
      },
    },
    {
      type: 'bug.reported',
      bug: aBug({
        id: 'bug-uuid',
        scenarioId: 'sc1',
        screenshotStepId: 'c',
        title: 'Cart total ignores quantity',
      }),
    },
    { type: 'run.finished', status: 'failed', durationMs: 21_000 },
  ];
}

export function sampleRunView(overrides: { label?: string; pageText?: string } = {}): RunView {
  return projectRun(stamp(sampleRunEvents(overrides)));
}
