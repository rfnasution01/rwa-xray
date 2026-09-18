import { describe, expect, it } from "vitest";

import { clientRateLimitKey, createFixedWindowRateLimiter } from "./rate-limit";

describe("fixed-window API rate limiter", () => {
  it("denies requests over the limit and resets after the window", () => {
    let now = 1_000;
    const limiter = createFixedWindowRateLimiter({
      limit: 2,
      windowMs: 60_000,
      now: () => now,
    });

    expect(limiter.check("client").allowed).toBe(true);
    expect(limiter.check("client").allowed).toBe(true);
    expect(limiter.check("client")).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    });

    now += 60_000;
    expect(limiter.check("client")).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("uses only the first forwarded address", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(clientRateLimitKey(request)).toBe("203.0.113.1");
  });
});
