import type { RunEvent, RunEventPayload } from '@/core/domain';
import { RUN_ID } from './domainBuilders';

/** Stamps payloads with runId, consecutive seq numbers and one-second-apart times. */
export function stamp(payloads: readonly RunEventPayload[], firstSeq = 1): RunEvent[] {
  return payloads.map((payload, index) => ({
    ...payload,
    runId: RUN_ID,
    seq: firstSeq + index,
    at: new Date(Date.UTC(2026, 9, 6, 8, 0, index)).toISOString(),
  }));
}
