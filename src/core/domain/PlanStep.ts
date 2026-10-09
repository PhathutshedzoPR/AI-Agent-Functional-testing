import { z } from 'zod';
import { DomainError } from '../errors';
import { ACTION_TYPES, INPUT_LIMITS } from './constants';
import { LocatorSchema } from './Locator';
import { parseDomain } from './parseDomain';

export const ActionTypeSchema = z.enum(ACTION_TYPES);
export type ActionType = z.infer<typeof ActionTypeSchema>;

/** One step of a scenario. Per-action rules (which need a target or value) live in StepFactory. */
export const PlanStepSchema = z.object({
  id: z.string().min(1),
  action: ActionTypeSchema,
  target: LocatorSchema.nullable(),
  value: z.string().nullable(),
  intent: z.string(),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;

export const PlanStep = {
  create(input: unknown): PlanStep {
    const step = parseDomain(PlanStepSchema, input, 'plan step');
    const intent = step.intent.trim();
    if (intent.length === 0) {
      throw new DomainError('A plan step needs an intent.');
    }
    if (step.value !== null && step.value.length > INPUT_LIMITS.stepValueMaxChars) {
      throw new DomainError(
        `A step value may be at most ${INPUT_LIMITS.stepValueMaxChars} characters.`,
      );
    }
    return { ...step, intent };
  },
} as const;
