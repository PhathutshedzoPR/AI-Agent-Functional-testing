import 'server-only';
import { createContainer, type Container } from './createContainer';
import { getEnv } from './env';
import { logger } from './logger';

// Cached on globalThis so hot reloads in development keep one queue, one repository, one browser.
const cache = globalThis as typeof globalThis & { __testpilotContainer?: Container };

/** The app's single container, built on first use. */
export function getContainer(): Container {
  cache.__testpilotContainer ??= createContainer(getEnv(), logger);
  return cache.__testpilotContainer;
}
