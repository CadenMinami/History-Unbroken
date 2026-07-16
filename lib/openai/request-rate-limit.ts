export interface RequestRateLimiter {
  allow(key: string): boolean;
}

interface SlidingWindowRateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export class SlidingWindowRateLimiter implements RequestRateLimiter {
  private readonly buckets = new Map<string, { count: number; windowStartedAt: number }>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor({ limit, windowMs, now = Date.now }: SlidingWindowRateLimiterOptions) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  allow(key: string): boolean {
    const now = this.now();
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStartedAt >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStartedAt: now });
      return true;
    }
    if (bucket.count >= this.limit) return false;
    bucket.count += 1;
    return true;
  }
}

export const aiRequestRateLimiter = new SlidingWindowRateLimiter({
  limit: 20,
  windowMs: 60_000,
});
