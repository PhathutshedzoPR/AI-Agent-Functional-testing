import { z } from 'zod';
import { DomainError } from '../errors';
import { HEALING_METHODS } from './constants';
import { Locator, LocatorSchema } from './Locator';
import { parseDomain } from './parseDomain';

export const HealingSchema = z.object({
  from: LocatorSchema,
  to: LocatorSchema,
  method: z.enum(HEALING_METHODS),
  strategy: z.string().min(1),
  reason: z.string().min(1),
});

/** Record of a broken locator replaced by a working one. Always shown for human review. */
export type Healing = z.infer<typeof HealingSchema>;

export const Healing = {
  create(input: unknown): Healing {
    const healing = parseDomain(HealingSchema, input, 'healing');
    if (Locator.equals(healing.from, healing.to)) {
      throw new DomainError('A healing must change the locator.');
    }
    return healing;
  },
} as const;
