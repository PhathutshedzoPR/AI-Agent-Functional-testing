import { z } from 'zod';
import { BugReportSchema } from './BugReport';
import { FindingSchema } from './Finding';
import { ScenarioStatusSchema } from './Scenario';
import { StepResultSchema } from './StepResult';
import { TestPlanSchema } from './TestPlan';

export const RunLimitsSchema = z.object({
  maxPages: z.number().int().positive(),
  maxScenarios: z.number().int().positive(),
  maxSteps: z.number().int().positive(),
  maxLlmCalls: z.number().int().positive(),
});
export type RunLimits = z.infer<typeof RunLimitsSchema>;

export const SafeErrorSchema = z.object({ code: z.string(), message: z.string() });
export type SafeError = z.infer<typeof SafeErrorSchema>;

const envelope = {
  runId: z.uuid(),
  seq: z.number().int().positive(),
  at: z.iso.datetime(),
};

function eventSchema<T extends string, S extends z.ZodRawShape>(type: T, shape: S) {
  return z.object({ ...envelope, type: z.literal(type), ...shape });
}

/** Everything a run publishes (Observer). The SSE stream, snapshots and history replay these. */
export const RunEventSchema = z.discriminatedUnion('type', [
  eventSchema('run.started', {
    targetUrl: z.string(),
    targetLabel: z.string(),
    story: z.string().nullable(),
    replayed: z.boolean(),
    limits: RunLimitsSchema,
  }),
  eventSchema('explore.page', { url: z.string(), title: z.string() }),
  eventSchema('plan.ready', {
    plan: TestPlanSchema,
    warnings: z.array(z.string()),
    criteriaInferred: z.boolean(),
  }),
  eventSchema('llm.called', {
    purpose: z.string(),
    used: z.number().int().min(0),
    max: z.number().int().min(0),
  }),
  eventSchema('scenario.started', { scenarioId: z.string() }),
  eventSchema('step.started', { scenarioId: z.string(), stepId: z.string() }),
  eventSchema('step.finished', { result: StepResultSchema }),
  eventSchema('finding', { finding: FindingSchema }),
  eventSchema('scenario.finished', { scenarioId: z.string(), status: ScenarioStatusSchema }),
  eventSchema('bug.reported', { bug: BugReportSchema }),
  eventSchema('run.finished', {
    status: z.enum(['passed', 'failed']),
    durationMs: z.number().int().min(0),
  }),
  eventSchema('run.failed', { error: SafeErrorSchema }),
  eventSchema('run.cancelled', {}),
]);

export type RunEvent = z.infer<typeof RunEventSchema>;
export type RunEventType = RunEvent['type'];
export type RunEventOf<T extends RunEventType> = Extract<RunEvent, { type: T }>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An event before the emitter stamps it with `runId`, `seq` and `at`. */
export type RunEventPayload = DistributiveOmit<RunEvent, 'runId' | 'seq' | 'at'>;

export const TERMINAL_EVENT_TYPES: ReadonlySet<RunEventType> = new Set([
  'run.finished',
  'run.failed',
  'run.cancelled',
]);
