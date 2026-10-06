import { RateLimitError } from '@/core/errors';

type Bucket = { tokens: number; updatedMs: number };

const MAX_TRACKED_CLIENTS = 10_000;
const MINUTE_MS = 60_000;

/** In-memory token bucket per client key (CLAUDE.md section 4, item 9). */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly perMinute: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Takes one token for `key`, or throws RateLimitError saying when to retry. */
  consume(key: string): void {
    const now = this.now();
    const bucket = this.refill(this.buckets.get(key), now);
    if (bucket.tokens < 1) {
      const msPerToken = MINUTE_MS / this.perMinute;
      throw new RateLimitError(Math.ceil(((1 - bucket.tokens) * msPerToken) / 1_000));
    }
    this.buckets.set(key, { tokens: bucket.tokens - 1, updatedMs: now });
    this.forgetIdleClients(now);
  }

  private refill(bucket: Bucket | undefined, now: number): Bucket {
    if (!bucket) return { tokens: this.perMinute, updatedMs: now };
    const earned = ((now - bucket.updatedMs) / MINUTE_MS) * this.perMinute;
    return { tokens: Math.min(this.perMinute, bucket.tokens + earned), updatedMs: now };
  }

  private forgetIdleClients(now: number): void {
    if (this.buckets.size <= MAX_TRACKED_CLIENTS) return;
    for (const [key, bucket] of this.buckets) {
      if (this.refill(bucket, now).tokens >= this.perMinute) this.buckets.delete(key);
    }
  }
}
