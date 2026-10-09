import { z } from 'zod';
import { DomainError } from '../errors';
import { parseDomain } from './parseDomain';
import { ScenarioSchema } from './Scenario';

export const TestPlanSchema = z.object({
  summary: z.string(),
  scenarios: z.array(ScenarioSchema).min(1),
});

export type TestPlan = z.infer<typeof TestPlanSchema>;

export const TestPlan = {
  create(input: unknown): TestPlan {
    const plan = parseDomain(TestPlanSchema, input, 'test plan');
    const ids = new Set(plan.scenarios.map((scenario) => scenario.id));
    if (ids.size !== plan.scenarios.length) {
      throw new DomainError('A test plan has duplicate scenario ids.');
    }
    return { ...plan, summary: plan.summary.trim() };
  },

  stepCount(plan: TestPlan): number {
    return plan.scenarios.reduce((total, scenario) => total + scenario.steps.length, 0);
  },
} as const;
