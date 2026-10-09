'use client';

import { describeStep, type ScenarioView } from '@/core/domain';
import { cn } from '@/lib/cn';
import { StatusBadge } from './StatusBadge';

type Props = Readonly<{
  scenarios: readonly ScenarioView[];
  selectedStepId: string | null;
  onSelect: (stepId: string) => void;
}>;

/** Every scenario and step with its status. Selecting a step shows its screenshot. */
export function StepList({ scenarios, selectedStepId, onSelect }: Props) {
  if (scenarios.length === 0) {
    return <p className="text-muted">The plan appears here once the agent has read the site.</p>;
  }
  return (
    <ol className="space-y-6">
      {scenarios.map((scenario) => (
        <li key={scenario.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-semibold">{scenario.title}</h3>
            <span className="text-sm text-muted">{scenario.kind}</span>
            <StatusBadge state={scenario.state} />
          </div>
          {scenario.criterion && <p className="text-sm text-muted">Checks: {scenario.criterion}</p>}
          <ol className="space-y-1">
            {scenario.steps.map((step, index) => (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  aria-pressed={selectedStepId === step.id}
                  aria-label={`Step ${index + 1} of ${scenario.steps.length}, ${describeStep(step)}, ${step.state}`}
                  className={cn(
                    'grid w-full grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-signal sm:grid-cols-[6.5rem_minmax(0,1fr)_auto]',
                    selectedStepId === step.id && 'bg-surface ring-1 ring-signal',
                  )}
                >
                  <StatusBadge state={step.state} />
                  <span className="[overflow-wrap:anywhere]">
                    {describeStep(step)}
                    {step.result?.error && (
                      <span className="mt-1 block text-failed">{step.result.error}</span>
                    )}
                  </span>
                  {/* On a phone the duration sits under the step instead of in a third column. */}
                  <span className="col-start-2 whitespace-nowrap tabular-nums text-muted sm:col-start-auto">
                    {step.result && step.state !== 'skipped' ? `${step.result.durationMs} ms` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
