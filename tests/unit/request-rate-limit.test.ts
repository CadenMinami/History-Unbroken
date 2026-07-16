import { describe, expect, it } from "vitest";

import { SlidingWindowRateLimiter } from "@/lib/openai/request-rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("limits a client within a window and resets after the window expires", () => {
    let now = 1_000;
    const limiter = new SlidingWindowRateLimiter({
      limit: 2,
      windowMs: 1_000,
      now: () => now,
    });

    expect(limiter.allow("client-a")).toBe(true);
    expect(limiter.allow("client-a")).toBe(true);
    expect(limiter.allow("client-a")).toBe(false);
    expect(limiter.allow("client-b")).toBe(true);

    now += 1_000;
    expect(limiter.allow("client-a")).toBe(true);
  });
});
