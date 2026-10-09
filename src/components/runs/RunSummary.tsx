'use client';

import { summariseRun, type RunView, type StepState } from '@/core/domain';
import { cn } from '@/lib/cn';
import { RerunActions } from './RerunActions';
import { StatusBadge } from './StatusBadge';

type Props = Readonly<{ runId: string; view: RunView; appBaseUrl: string }>;

const BORDERS: Readonly<Record<StepState, string>> = {
  pending: 'border-divider',
  running: 'border-divider',
  passed: 'border-passed',
  healed: 'border-healed',
  failed: 'border-failed',
  skipped: 'border-divider',
};

/** Once a run lands: what happened, in one sentence of real numbers, and what to try next. */
export function RunSummary({ runId, view, appBaseUrl }: Props) {
  const summary = summariseRun(view);
  if (!summary) return null;
  return (
    <section
      role="status"
      aria-label="Run summary"
      className={cn('space-y-3 rounded-[20px] border bg-raised p-5', BORDERS[summary.state])}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusBadge state={summary.state} />
        <p className="text-lg font-semibold">{summary.headline}</p>
      </div>
      {summary.hint && <p className="max-w-[75ch] text-muted">{summary.hint}</p>}
      {view.scenarios.length > 0 && (
        <RerunActions
          runId={runId}
          appBaseUrl={appBaseUrl}
          currentUrl={view.targetUrl}
          device={view.device}
        />
      )}
    </section>
  );
}
