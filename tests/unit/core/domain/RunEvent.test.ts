import { describe, expect, it } from 'vitest';
import { RunEventSchema, TERMINAL_EVENT_TYPES } from '@/core/domain';
import { RUN_ID, aPlan, aStepResult } from '../../../fakes/domainBuilders';

const envelope = { runId: RUN_ID, seq: 1, at: '2026-10-06T08:00:00.000Z' };

describe('RunEventSchema', () => {
  it('parses each event by its type', () => {
    const planReady = RunEventSchema.parse({
      ...envelope,
      type: 'plan.ready',
      plan: aPlan(),
      warnings: [],
      criteriaInferred: true,
    });
    const stepFinished = RunEventSchema.parse({
      ...envelope,
      seq: 2,
      type: 'step.finished',
      result: aStepResult(),
    });

    expect(planReady.type).toBe('plan.ready');
    expect(stepFinished.type === 'step.finished' && stepFinished.result.status).toBe('passed');
  });

  it('rejects unknown types, missing envelopes and bad sequence numbers', () => {
    expect(RunEventSchema.safeParse({ ...envelope, type: 'run.exploded' }).success).toBe(false);
    expect(RunEventSchema.safeParse({ type: 'run.cancelled' }).success).toBe(false);
    expect(RunEventSchema.safeParse({ ...envelope, seq: 0, type: 'run.cancelled' }).success).toBe(
      false,
    );
  });

  it('knows which events end a run', () => {
    expect(TERMINAL_EVENT_TYPES.has('run.finished')).toBe(true);
    expect(TERMINAL_EVENT_TYPES.has('step.finished')).toBe(false);
  });
});
