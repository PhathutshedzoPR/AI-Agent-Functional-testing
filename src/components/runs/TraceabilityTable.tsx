'use client';

import { CircleDashed } from 'lucide-react';
import {
  CRITERION_VERDICT_LABELS,
  traceCriteria,
  type CriterionVerdict,
  type ScenarioView,
} from '@/core/domain';
import { StatusBadge } from './StatusBadge';

type Props = Readonly<{
  criteria: readonly string[];
  criteriaInferred: boolean;
  scenarios: readonly ScenarioView[];
  onSelect: (stepId: string) => void;
}>;

function Verdict({ verdict }: Readonly<{ verdict: CriterionVerdict }>) {
  if (verdict !== 'untested') return <StatusBadge state={verdict} />;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-skipped">
      <CircleDashed aria-hidden="true" className="size-4" />
      {CRITERION_VERDICT_LABELS.untested}
    </span>
  );
}

/** Each acceptance criterion, the scenarios that check it and what the browser found. */
export function TraceabilityTable({ criteria, criteriaInferred, scenarios, onSelect }: Props) {
  const rows = traceCriteria({ criteria, scenarios });
  if (rows.length === 0) {
    return <p className="text-muted">Criteria appear here once the agent has planned the run.</p>;
  }
  return (
    <div className="space-y-3">
      {criteriaInferred && (
        <p className="text-sm text-muted">
          The story had no acceptance criteria, so TestPilot proposed these.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Acceptance criteria and the scenarios that test them
          </caption>
          <thead className="text-muted">
            <tr className="border-b border-divider">
              <th scope="col" className="py-2 pr-4 font-semibold">
                Criterion
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                Scenarios
              </th>
              <th scope="col" className="py-2 font-semibold max-sm:hidden">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.criterion ?? 'unlinked'} className="border-b border-divider align-top">
                <th scope="row" className="py-3 pr-4 font-medium">
                  {row.criterion ?? <span className="text-muted">Not linked to a criterion</span>}
                  {/* On a phone the result sits under the criterion instead of in a third column. */}
                  <div className="mt-1 sm:hidden">
                    <Verdict verdict={row.verdict} />
                  </div>
                </th>
                <td className="py-3 pr-4">
                  {row.scenarios.length === 0 ? (
                    <span className="text-muted">No scenario checks this</span>
                  ) : (
                    <ul className="space-y-1">
                      {row.scenarios.map((scenario) => (
                        <li key={scenario.id}>
                          <ScenarioLink scenario={scenario} onSelect={onSelect} />
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="py-3 max-sm:hidden">
                  <Verdict verdict={row.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScenarioLink({
  scenario,
  onSelect,
}: Readonly<{ scenario: ScenarioView; onSelect: (stepId: string) => void }>) {
  const first = scenario.steps[0];
  if (!first) return <span>{scenario.title}</span>;
  return (
    <button
      type="button"
      onClick={() => onSelect(first.id)}
      className="text-left font-semibold text-signal underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-signal"
    >
      {scenario.title}
    </button>
  );
}
