import { z } from 'zod';
import { DomainError } from '../errors';
import { SEVERITIES } from './constants';
import { FindingSchema } from './Finding';
import { parseDomain } from './parseDomain';

export const SeveritySchema = z.enum(SEVERITIES);
export type Severity = z.infer<typeof SeveritySchema>;

export const BugReportSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  severity: SeveritySchema,
  scenarioId: z.string().min(1),
  stepsToReproduce: z.array(z.string().min(1)).min(1),
  expected: z.string().min(1),
  actual: z.string().min(1),
  screenshotStepId: z.string().nullable(),
  findings: z.array(FindingSchema),
});

export type BugReport = z.infer<typeof BugReportSchema>;

export const BugReport = {
  create(input: unknown): BugReport {
    const bug = parseDomain(BugReportSchema, input, 'bug report');
    const title = bug.title.trim();
    if (title.length === 0) {
      throw new DomainError('A bug report needs a title.');
    }
    return { ...bug, title };
  },
} as const;
