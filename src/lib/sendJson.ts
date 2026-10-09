import type { z } from 'zod';
import { ErrorResponseSchema } from '@/contracts';

/** Thrown with the server's own safe message, ready to show to the user. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** POSTs JSON to our API and parses the reply with `schema`. */
export async function sendJson<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(
      'Could not reach TestPilot. Check that the server is running.',
      'NETWORK',
      0,
    );
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ErrorResponseSchema.safeParse(payload);
    const error = parsed.success
      ? parsed.data.error
      : { code: 'UNKNOWN', message: `The server answered ${response.status}.` };
    throw new ApiRequestError(error.message, error.code, response.status);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiRequestError(
      'The server sent a reply we did not expect.',
      'BAD_RESPONSE',
      response.status,
    );
  }
  return parsed.data;
}
