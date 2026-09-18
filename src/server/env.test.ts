import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("server environment", () => {
  it("parses required production configuration without exposing it", async () => {
    vi.stubEnv("CMC_API_KEY", "test-only-key");
    vi.stubEnv("CMC_API_BASE_URL", "https://pro-api.coinmarketcap.com");
    vi.stubEnv("DATABASE_URL", "postgresql://example.invalid/database");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("SENTRY_DSN", "");

    const { getServerEnv } = await import("./env");
    const environment = getServerEnv();

    expect(environment.CMC_API_KEY).toBe("test-only-key");
    expect(environment.GEMINI_API_KEY).toBeUndefined();
    expect(environment.SENTRY_DSN).toBeUndefined();
  });

  it("throws a generic configuration error without field names or values", async () => {
    vi.stubEnv("CMC_API_KEY", "");
    vi.stubEnv("DATABASE_URL", "");

    const { getServerEnv, ServerEnvironmentError } = await import("./env");

    expect(getServerEnv).toThrow(ServerEnvironmentError);
    expect(getServerEnv).toThrow("Server environment configuration is invalid");
    try {
      getServerEnv();
    } catch (error) {
      expect(String(error)).not.toContain("CMC_API_KEY");
      expect(String(error)).not.toContain("DATABASE_URL");
    }
  });
});
