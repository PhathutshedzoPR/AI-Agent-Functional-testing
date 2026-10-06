'use client';

import { useEffect, useState } from 'react';
import { runApiPaths } from '@/contracts';
import {
  EMPTY_RUN_VIEW,
  RunEventSchema,
  TERMINAL_EVENT_TYPES,
  applyRunEvent,
  type RunView,
} from '@/core/domain';

export type StreamState = 'connecting' | 'live' | 'ended' | 'lost';

function parseEvent(data: string) {
  try {
    const parsed = RunEventSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    // A malformed message is skipped; the next valid event still applies.
    return null;
  }
}

/**
 * Follows a run over Server-Sent Events and folds each event into the view with projectRun's
 * reducer. Reconnects are safe: the server resumes after the last id and the reducer ignores
 * anything already seen.
 */
export function useRunStream(runId: string): Readonly<{ view: RunView; stream: StreamState }> {
  const [view, setView] = useState<RunView>(EMPTY_RUN_VIEW);
  const [stream, setStream] = useState<StreamState>('connecting');

  useEffect(() => {
    const source = new EventSource(runApiPaths.events(runId));
    source.onopen = () => setStream('live');
    source.onmessage = (message: MessageEvent<string>) => {
      const event = parseEvent(message.data);
      if (!event) return;
      setView((current) => applyRunEvent(current, event));
      if (TERMINAL_EVENT_TYPES.has(event.type)) {
        source.close();
        setStream('ended');
      }
    };
    source.onerror = () => {
      setStream(source.readyState === EventSource.CLOSED ? 'lost' : 'connecting');
    };
    return () => source.close();
  }, [runId]);

  return { view, stream };
}
