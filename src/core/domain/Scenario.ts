import { z } from 'zod';
import { DomainError } from '../errors';
import { PRIORITIES, SCENARIO_KINDS, SCENARIO_STATUSES } from './constants';
import { parseDomain } from './parseDomain';
import { PlanStepSchema } from './PlanStep';

export const ScenarioKindSchema = z.enum(SCENARIO_KINDS);
export type ScenarioKind = z.infer<typeof ScenarioKindSchema>;

export const PrioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof PrioritySchema>;

export const ScenarioStatusSchema = z.enum(SCENARIO_STATUSES);
export type ScenarioStatus = z.infer<typeof ScenarioStatusSchema>;

export const ScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  kind: ScenarioKindSchema,
  criterion: z.string().nullable(),
  priority: PrioritySchema,
  steps: z.array(PlanStepSchema).min(1),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

export const Scenario = {
  create(input: unknown): Scenario {
    const scenario = parseDomain(ScenarioSchema, input, 'scenario');
    const title = scenario.title.trim();
    if (title.length === 0) {
      throw new DomainError('A scenario needs a title.');
    }
    const ids = new Set(scenario.steps.map((step) => step.id));
    if (ids.size !== scenario.steps.length) {
      throw new DomainError(`Scenario "${title}" has duplicate step ids.`);
    }
    const criterion = scenario.criterion?.trim() ?? '';
    return { ...scenario, title, criterion: criterion.length > 0 ? criterion : null };
  },
} as const;
