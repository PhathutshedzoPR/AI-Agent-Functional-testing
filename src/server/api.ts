import 'server-only';
import { getContainer } from './container';
import { defineApiHandler } from './http/defineApiHandler';
import { logger } from './logger';

/** The wrapper every route handler uses (validation, origin check, rate limit, errors, logs). */
export const withApiHandler = defineApiHandler({
  container: getContainer,
  logger,
  appBaseUrl: (container) => container.env.APP_BASE_URL,
  rateLimiter: (container, name) => container.rateLimits[name],
});
