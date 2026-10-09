import { z } from 'zod';
import { DomainError } from '../errors';
import { STEP_STATUSES } from './constants';
import { HealingSchema } from './Healing';
import { parseDomain } from './parseDomain';

export const StepStatusSchema = z.enum(STEP_STATUSES);
export type StepStatus = z.infer<typeof StepStatusSchema>;

export const StepResultSchema = z.object({
  stepId: z.string().min(1),
  scenarioId: z.string().min(1),
  status: StepStatusSchema,
  durationMs: z.number().int().min(0),
  url: z.string().nullable(),
  screenshot: z.boolean(),
  error: z.string().nullable(),
  healing: HealingSchema.nullable(),
});

/** What really happened when a step ran. Every field is measured or captured, never generated. */
export type StepResult = z.infer<typeof StepResultSchema>;

export const StepResult = {
  create(input: unknown): StepResult {
    const result = parseDomain(StepResultSchema, input, 'step result');
    if (result.status === 'failed' && !result.error) {
      throw new DomainError('A failed step must say what went wrong.');
    }
    if (result.status === 'healed' && !result.healing) {
      throw new DomainError('A healed step must record its healing.');
    }
    if (result.healing && result.status !== 'healed' && result.status !== 'failed') {
      throw new DomainError('Only healed or failed steps may carry a healing.');
    }
    if (result.status === 'skipped' && result.screenshot) {
      throw new DomainError('A skipped step has no screenshot.');
    }
    return result;
  },

  skipped(scenarioId: string, stepId: string): StepResult {
    return {
      stepId,
      scenarioId,
      status: 'skipped',
      durationMs: 0,
      url: null,
      screenshot: false,
      error: null,
      healing: null,
    };
  },
} as const;
