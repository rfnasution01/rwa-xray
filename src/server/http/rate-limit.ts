export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimiter = {
  check(key: string): RateLimitDecision;
};

export function createFixedWindowRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new TypeError("Rate-limit count must be a positive integer");
  }
  if (!Number.isFinite(options.windowMs) || options.windowMs <= 0) {
    throw new TypeError("Rate-limit window must be positive");
  }

  const now = options.now ?? Date.now;
  const windows = new Map<string, { count: number; resetsAt: number }>();

  return {
    check(key) {
      const currentTime = now();
      const existing = windows.get(key);
      const window =
        !existing || currentTime >= existing.resetsAt
          ? { count: 0, resetsAt: currentTime + options.windowMs }
          : existing;
      window.count += 1;
      windows.set(key, window);

      if (windows.size > 10_000) {
        for (const [candidate, value] of windows) {
          if (currentTime >= value.resetsAt) windows.delete(candidate);
        }
      }

      return {
        allowed: window.count <= options.limit,
        remaining: Math.max(0, options.limit - window.count),
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((window.resetsAt - currentTime) / 1_000),
        ),
      };
    },
  };
}

export const apiRateLimiter = createFixedWindowRateLimiter({
  limit: 60,
  windowMs: 60_000,
});

export function clientRateLimitKey(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}
