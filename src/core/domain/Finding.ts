import { z } from 'zod';
import { FINDING_KINDS } from './constants';
import { parseDomain } from './parseDomain';

export const FindingKindSchema = z.enum(FINDING_KINDS);
export type FindingKind = z.infer<typeof FindingKindSchema>;

/** Something the browser reported on its own: console errors, uncaught errors, 4xx/5xx responses. */
export const FindingSchema = z.object({
  id: z.string().min(1),
  kind: FindingKindSchema,
  message: z.string().min(1),
  url: z.string(),
  status: z.number().int().nullable(),
  scenarioId: z.string().nullable(),
  stepId: z.string().nullable(),
});

export type Finding = z.infer<typeof FindingSchema>;

export const Finding = {
  create(input: unknown): Finding {
    return parseDomain(FindingSchema, input, 'finding');
  },
} as const;
