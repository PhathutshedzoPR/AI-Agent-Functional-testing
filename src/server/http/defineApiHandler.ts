import type { z } from 'zod';
import { ValidationError } from '@/core/errors';
import type { Logger } from '../logger';
import type { RateLimiter } from '../security/RateLimiter';
import { assertSameOrigin } from './assertSameOrigin';
import { clientKey } from './clientKey';
import { errorResponse } from './errorResponse';

export type ApiDependencies<C> = Readonly<{
  container: () => C;
  logger: Logger;
  appBaseUrl: (container: C) => string;
  rateLimiter: (container: C, name: 'startRun') => RateLimiter;
}>;

export type ApiSpec<P, B> = Readonly<{
  params?: z.ZodType<P>;
  body?: z.ZodType<B>;
  /** State-changing routes: the Origin header must be the app's own. */
  sameOrigin?: boolean;
  rateLimit?: 'startRun';
}>;

export type ApiArgs<C, P, B> = Readonly<{ request: Request; params: P; body: B; container: C }>;

type RouteContext = Readonly<{ params: Promise<unknown> }>;

const MAX_BODY_BYTES = 16_384;

/**
 * Builds the wrapper every route handler goes through: same-origin check, rate limit, params and
 * body validation, error mapping and request logging, in that order (CLAUDE.md section 3, DRY 2).
 */
export function defineApiHandler<C>(deps: ApiDependencies<C>) {
  return function withApiHandler<P = undefined, B = undefined>(
    spec: ApiSpec<P, B>,
    handler: (args: ApiArgs<C, P, B>) => Promise<Response>,
  ): (request: Request, context: RouteContext) => Promise<Response> {
    return async (request, context) => {
      const started = performance.now();
      let status = 500;
      try {
        const container = deps.container();
        if (spec.sameOrigin) assertSameOrigin(request, deps.appBaseUrl(container));
        if (spec.rateLimit) deps.rateLimiter(container, spec.rateLimit).consume(clientKey(request));
        const params = parse(spec.params, await context.params, 'route');
        const body = spec.body ? parse(spec.body, await readJson(request), 'body') : undefined;
        // parse() returns undefined only when the spec has no schema, and then P or B is undefined.
        const response = await handler({
          request,
          params: params as P,
          body: body as B,
          container,
        });
        status = response.status;
        return response;
      } catch (error) {
        const response = errorResponse(error, deps.logger);
        status = response.status;
        return response;
      } finally {
        deps.logger.info('api', {
          method: request.method,
          path: new URL(request.url).pathname,
          status,
          ms: Math.round(performance.now() - started),
        });
      }
    };
  };
}

function parse<T>(schema: z.ZodType<T> | undefined, input: unknown, where: string): T | undefined {
  if (!schema) return undefined;
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new ValidationError(
    `The request ${where} is not valid.`,
    result.error.issues.map((issue) => ({
      path: issue.path.join('.') || where,
      message: issue.message,
    })),
  );
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ValidationError('The request body is too large.');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ValidationError('The request body must be JSON.');
  }
}
