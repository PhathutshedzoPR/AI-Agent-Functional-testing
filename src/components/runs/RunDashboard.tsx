'use client';

import { useState } from 'react';
import { TestRun, type RunView, type StepView } from '@/core/domain';
import { useRunStream } from '@/hooks/useRunStream';
import { AgentFeed } from './AgentFeed';
import { BugCard } from './BugCard';
import { LiveBrowser } from './LiveBrowser';
import { RerunActions } from './RerunActions';
import { RunHeader } from './RunHeader';
import { StepList } from './StepList';

type Props = Readonly<{ runId: string; appBaseUrl: string }>;

function findStep(view: RunView, stepId: string | null): StepView | null {
  if (!stepId) return null;
  for (const scenario of view.scenarios) {
    const step = scenario.steps.find((candidate) => candidate.id === stepId);
    if (step) return step;
  }
  return null;
}

/** The latest step with a screenshot: what the browser shows right now. */
function latestCaptured(view: RunView): StepView | null {
  const captured = view.scenarios.flatMap((s) => s.steps).filter((s) => s.result?.screenshot);
  return captured.at(-1) ?? null;
}

const STAT_LABELS = [
  ['passed', 'Passed'],
  ['healed', 'Healed'],
  ['failed', 'Failed'],
  ['bugs', 'Bugs'],
] as const;

/** The live run: header, steps, real screenshots, stats, the agent's feed and bugs. */
export function RunDashboard({ runId, appBaseUrl }: Props) {
  const { view, stream } = useRunStream(runId);
  const [selected, setSelected] = useState<string | null>(null);
  const shown = findStep(view, selected) ?? latestCaptured(view);
  const finished = TestRun.isFinal(view.status);

  return (
    <div className="space-y-5">
      <RunHeader runId={runId} view={view} />
      {stream === 'lost' && (
        <p role="alert" className="text-sm text-failed">
          Lost the live connection. Reload the page to pick up where it left off.
        </p>
      )}
      {view.error && (
        <p role="alert" className="rounded-xl border border-failed p-3">
          {view.error.message}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          aria-label="Live browser"
          className="rounded-[20px] border border-divider bg-raised p-5"
        >
          <LiveBrowser runId={runId} step={shown} />
        </section>
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-3">
            {STAT_LABELS.map(([key, label]) => (
              <div key={key} className="rounded-xl border border-divider bg-raised p-4">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="font-serif text-4xl">{view.stats[key]}</dd>
              </div>
            ))}
          </dl>
          <AgentFeed items={view.feed} />
        </div>
      </div>
      {view.warnings.length > 0 && (
        <details className="rounded-xl border border-divider bg-raised p-4">
          <summary className="cursor-pointer font-semibold">
            Planner warnings ({view.warnings.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {view.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      <section
        aria-labelledby="steps-heading"
        className="rounded-[20px] border border-divider bg-raised p-5"
      >
        <h2 id="steps-heading" className="mb-4 text-lg font-semibold">
          Steps
        </h2>
        <StepList
          scenarios={view.scenarios}
          selectedStepId={shown?.id ?? null}
          onSelect={setSelected}
        />
      </section>
      {view.bugs.length > 0 && (
        <section aria-labelledby="bugs-heading" className="space-y-3">
          <h2 id="bugs-heading" className="text-lg font-semibold">
            Bugs
          </h2>
          {view.bugs.map((bug) => (
            <BugCard key={bug.id} runId={runId} bug={bug} />
          ))}
        </section>
      )}
      {finished && view.scenarios.length > 0 && (
        <RerunActions runId={runId} appBaseUrl={appBaseUrl} currentUrl={view.targetUrl} />
      )}
    </div>
  );
}
