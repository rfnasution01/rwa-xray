import { afterEach, describe, expect, it } from "vitest";

import { createLogRecord } from "./logger";
import { sanitizeSentryEvent } from "./sentry";

const originalCmcApiKey = process.env.CMC_API_KEY;

afterEach(() => {
  if (originalCmcApiKey === undefined) {
    delete process.env.CMC_API_KEY;
  } else {
    process.env.CMC_API_KEY = originalCmcApiKey;
  }
});

describe("structured server logs", () => {
  it("emits stable JSON fields and redacts sensitive context", () => {
    const record = createLogRecord(
      "error",
      "api.internal_error",
      {
        requestId: "request-1",
        authorization: "Bearer secret",
        nested: { database_url: "postgres://secret" },
      },
      new Date("2026-01-02T03:04:05.000Z"),
    );

    expect(record).toEqual({
      timestamp: "2026-01-02T03:04:05.000Z",
      level: "error",
      event: "api.internal_error",
      service: "rwa-xray",
      context: {
        requestId: "request-1",
        authorization: "[REDACTED]",
        nested: { database_url: "[REDACTED]" },
      },
    });
  });
});

describe("Sentry event sanitization", () => {
  it("removes request details and known secrets before transport", () => {
    process.env.CMC_API_KEY = "cmc-secret-value";

    const sanitized = sanitizeSentryEvent({
      type: undefined,
      message: "Failed with cmc-secret-value",
      request: {
        url: "https://example.test/api/assets?query=private#fragment",
        headers: { authorization: "Bearer secret" },
        cookies: { session: "secret" },
        data: "private body",
        query_string: "query=private",
      },
      extra: { CMC_API_KEY: "cmc-secret-value" },
      user: { id: "private-user" },
      breadcrumbs: [
        {
          data: {
            url: "https://example.test/api/assets?query=private",
          },
        },
      ],
    });

    expect(sanitized.message).toBe("Failed with [REDACTED]");
    expect(sanitized.request).toEqual({
      url: "https://example.test/api/assets",
      headers: undefined,
      cookies: undefined,
      data: undefined,
      query_string: undefined,
    });
    expect(sanitized.extra).toEqual({ CMC_API_KEY: "[REDACTED]" });
    expect(sanitized.user).toBeUndefined();
    expect(sanitized.breadcrumbs?.[0]?.data?.url).toBe(
      "https://example.test/api/assets",
    );
  });
});
