'use client';

import { useEffect, useState } from 'react';
import { RunResponseSchema, runApiPaths } from '@/contracts';
import { RUN_STATUS_LABELS, type RunView } from '@/core/domain';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/formatDuration';
import { ApiRequestError, sendJson } from '@/lib/sendJson';
import { buttonStyles } from '../ui';

type Props = Readonly<{ runId: string; view: RunView }>;

function useElapsed(view: RunView): number | null {
  const [now, setNow] = useState(() => Date.now());
  const running = view.status === 'running';
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [running]);
  if (view.durationMs !== null) return view.durationMs;
  if (!view.startedAt) return null;
  const end = view.finishedAt ? Date.parse(view.finishedAt) : now;
  return end - Date.parse(view.startedAt);
}

/** Target, status, elapsed time, LLM calls used and the stop button. */
export function RunHeader({ runId, view }: Props) {
  const elapsed = useElapsed(view);
  const [stopError, setStopError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const canStop = view.status === 'running' || view.status === 'queued';

  const stop = async (): Promise<void> => {
    setStopping(true);
    try {
      await sendJson(runApiPaths.cancel(runId), {}, RunResponseSchema);
    } catch (error) {
      setStopError(error instanceof ApiRequestError ? error.message : 'Could not stop the run.');
      setStopping(false);
    }
  };

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[20px] border border-divider bg-raised px-5 py-4">
      <h1 className="text-xl font-semibold">
        {view.targetLabel ?? 'Waiting for the run to start'}
      </h1>
      <p className="font-semibold" aria-live="polite">
        {RUN_STATUS_LABELS[view.status]}
      </p>
      {elapsed !== null && <p className="tabular-nums text-muted">{formatDuration(elapsed)}</p>}
      {view.limits && (
        <p className="text-muted">
          LLM calls {view.llmCallsUsed}/{view.limits.maxLlmCalls}
        </p>
      )}
      {view.replayed && (
        <p className="rounded-full border border-control px-3 py-0.5 text-sm text-muted">
          Replayed plan
        </p>
      )}
      {canStop && (
        <button
          type="button"
          onClick={() => void stop()}
          disabled={stopping}
          className={cn(
            buttonStyles({ tone: 'outline', size: 'sm' }),
            'ml-auto hover:border-failed',
          )}
        >
          {stopping ? 'Stopping...' : 'Stop run'}
        </button>
      )}
      {stopError && (
        <p role="alert" className="w-full text-sm text-failed">
          {stopError}
        </p>
      )}
    </header>
  );
}
