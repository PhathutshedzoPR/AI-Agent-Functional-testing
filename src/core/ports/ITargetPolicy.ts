/** Decides which URLs the agent's browser may reach (SSRF guard). */
export interface ITargetPolicy {
  /** Returns the parsed URL, or throws TargetBlockedError with a safe reason. */
  assertAllowed(url: string): Promise<URL>;
  /** Non-throwing check used for every request the browser makes, including redirects. */
  isAllowed(url: string): Promise<boolean>;
}
