import type { z } from 'zod';
import { DomainError } from '../errors';

/** Parses `input` with `schema`, turning Zod issues into a DomainError that names `what`. */
export function parseDomain<S extends z.ZodType>(
  schema: S,
  input: unknown,
  what: string,
): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const details = result.error.issues.map(
    (issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`,
  );
  throw new DomainError(`Invalid ${what}.`, details);
}
