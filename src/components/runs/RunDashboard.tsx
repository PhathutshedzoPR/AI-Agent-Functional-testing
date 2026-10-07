'use client';

import { useState } from 'react';
import { TestRun, type RunView, type StepView } from '@/core/domain';
import { useRunStream } from '@/hooks/useRunStream';
import { cn } from '@/lib/cn';
import { Mascot } from '../brand/Mascot';
import { AgentFeed } from './AgentFeed';
import { BugCard } from './BugCard';
import { ExportMenu } from './ExportMenu';
import { FlightPath } from './FlightPath';
import { LiveBrowser } from './LiveBrowser';
import { RerunActions } from './RerunActions';
import { ReviewList } from './ReviewList';
import { RunHeader } from './RunHeader';
import { RunTabs } from './RunTabs';
import { StepList } from './StepList';
import { TraceabilityTable } from './TraceabilityTable';

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

const TILES = [
  { key: 'passed', label: 'Passed', className: 'bg-sky text-ink' },
  { key: 'healed', label: 'Healed', className: 'border border-divider bg-raised' },
  { key: 'failed', label: 'Failed', className: 'border border-divider bg-raised' },
  { key: 'bugs', label: 'Bugs', className: 'bg-orchid text-ink' },
] as const;

const panel = 'rounded-[20px] border border-divider bg-raised p-5';

/** The live run: header, flight path, real screenshots, stats, the agent's feed and details. */
export function RunDashboard({ runId, appBaseUrl }: Props) {
  const { view, stream } = useRunStream(runId);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState('steps');
  const shown = findStep(view, selected) ?? latestCaptured(view);
  const finished = TestRun.isFinal(view.status);
  const healedCount = view.stats.healed;
  const showStep = (stepId: string): void => {
    setSelected(stepId);
    setTab('steps');
  };

  const tabs = [
    {
      id: 'steps',
      label: 'Steps',
      content: (
        <StepList
          scenarios={view.scenarios}
          selectedStepId={shown?.id ?? null}
          onSelect={setSelected}
        />
      ),
    },
    {
      id: 'bugs',
      label: `Bugs (${view.bugs.length})`,
      content:
        view.bugs.length === 0 ? (
          <div className="flex items-center gap-4 text-muted">
            <Mascot mood={finished ? 'idle' : 'flying'} className="size-16" />
            <p>{finished ? 'No bugs in this run.' : 'No bugs so far.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {view.bugs.map((bug) => (
              <BugCard key={bug.id} runId={runId} bug={bug} />
            ))}
          </div>
        ),
    },
    {
      id: 'review',
      label: `Needs review (${healedCount})`,
      content: <ReviewList scenarios={view.scenarios} onSelect={showStep} />,
    },
    {
      id: 'trace',
      label: 'Traceability',
      content: (
        <TraceabilityTable
          criteria={view.criteria}
          criteriaInferred={view.criteriaInferred}
          scenarios={view.scenarios}
          onSelect={showStep}
        />
      ),
    },
    { id: 'export', label: 'Export', content: <ExportMenu runId={runId} ready={finished} /> },
  ];

  return (
    <div className="space-y-5">
      <RunHeader runId={runId} view={view} />
      {stream === 'lost' && (
        <p role="alert" className="text-sm text-failed">
          Lost the live connection. Reload the page to pick up where it left off.
        </p>
      )}
      {view.error && (
        <div
          role="alert"
          className="flex items-center gap-4 rounded-[20px] border border-failed p-4"
        >
          <Mascot mood="worried" className="size-14" />
          <p>{view.error.message}</p>
        </div>
      )}
      <section aria-labelledby="flight-heading" className={panel}>
        <h2 id="flight-heading" className="mb-3 text-lg font-semibold">
          Flight path
        </h2>
        <FlightPath
          scenarios={view.scenarios}
          selectedStepId={shown?.id ?? null}
          onSelect={setSelected}
        />
      </section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-label="Live browser" className={panel}>
          <LiveBrowser runId={runId} step={shown} />
        </section>
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-3">
            {TILES.map((tile) => (
              <div key={tile.key} className={cn('rounded-xl p-4', tile.className)}>
                <dt className="text-sm font-semibold opacity-80">{tile.label}</dt>
                <dd className="font-serif text-5xl leading-tight">{view.stats[tile.key]}</dd>
              </div>
            ))}
          </dl>
          <AgentFeed items={view.feed} />
        </div>
      </div>
      {view.warnings.length > 0 && (
        <details className={panel}>
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
      <section aria-label="Run details" className={panel}>
        <RunTabs tabs={tabs} active={tab} onChange={setTab} />
      </section>
      {finished && view.scenarios.length > 0 && (
        <RerunActions runId={runId} appBaseUrl={appBaseUrl} currentUrl={view.targetUrl} />
      )}
    </div>
  );
}
