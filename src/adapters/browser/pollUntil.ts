export type PollOutcome<T> = Readonly<{ value: T; done: boolean }>;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads repeatedly until `done(value)` holds or `timeoutMs` passes, like Playwright's
 * auto-retrying assertions. Always reads at least once and returns the last value seen.
 */
export async function pollUntil<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  options: Readonly<{ timeoutMs: number; intervalMs?: number }>,
): Promise<PollOutcome<T>> {
  const deadline = performance.now() + options.timeoutMs;
  const interval = options.intervalMs ?? 100;
  let value = await read();
  while (!done(value)) {
    if (performance.now() + interval > deadline) {
      return { value, done: false };
    }
    await sleep(interval);
    value = await read();
  }
  return { value, done: true };
}
