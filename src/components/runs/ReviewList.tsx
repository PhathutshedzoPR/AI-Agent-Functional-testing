import { Locator, describeStep, type ScenarioView } from '@/core/domain';

type Props = Readonly<{ scenarios: readonly ScenarioView[]; onSelect: (stepId: string) => void }>;

/** Healed steps: they passed only because TestPilot found a replacement, so a person should look. */
export function ReviewList({ scenarios, onSelect }: Props) {
  const healed = scenarios.flatMap((scenario) =>
    scenario.steps.flatMap((step) =>
      step.result?.healing ? [{ scenario, step, healing: step.result.healing }] : [],
    ),
  );
  if (healed.length === 0) {
    return <p className="text-muted">Nothing to review. No step needed a replacement locator.</p>;
  }
  return (
    <ul className="space-y-3">
      {healed.map(({ scenario, step, healing }) => (
        <li key={step.id} className="rounded-xl border border-healed/50 bg-surface p-4">
          <p className="text-sm text-muted">{scenario.title}</p>
          <p className="font-semibold">{describeStep(step)}</p>
          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[6rem_1fr]">
            <dt className="text-muted">Was</dt>
            <dd className="font-mono">{Locator.describe(healing.from)}</dd>
            <dt className="text-muted">Now</dt>
            <dd className="font-mono">{Locator.describe(healing.to)}</dd>
            <dt className="text-muted">Found by</dt>
            <dd>
              {healing.method === 'rule'
                ? 'a rule, no LLM'
                : 'the LLM, then checked in the browser'}
            </dd>
            <dt className="text-muted">Why</dt>
            <dd>{healing.reason}</dd>
          </dl>
          <button
            type="button"
            onClick={() => onSelect(step.id)}
            className="mt-3 text-sm font-semibold text-signal underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-signal"
          >
            Show the screenshot
          </button>
        </li>
      ))}
    </ul>
  );
}
