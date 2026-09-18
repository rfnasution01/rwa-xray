import { describe, expect, it, vi } from "vitest";

import assetsListFixture from "../../../tests/fixtures/cmc/rwa-assets-list.json";
import infoFixture from "../../../tests/fixtures/cmc/rwa-info.json";
import issuerFixture from "../../../tests/fixtures/cmc/rwa-issuer.json";
import issuersListFixture from "../../../tests/fixtures/cmc/rwa-issuers-list.json";
import mapFixture from "../../../tests/fixtures/cmc/rwa-map.json";
import marketPairsFixture from "../../../tests/fixtures/cmc/rwa-market-pairs.json";
import quotesLatestFixture from "../../../tests/fixtures/cmc/rwa-quotes-latest.json";
import { createCmcClient } from "./client";
import { CmcApiError } from "./error";
import { redactSensitive } from "./redact";

const fixturesByPath: Record<string, unknown> = {
  "/v5/real-world-assets/map": mapFixture,
  "/v5/real-world-assets/info": infoFixture,
  "/v5/real-world-assets/assets/list": assetsListFixture,
  "/v5/real-world-assets/market-pairs/list": marketPairsFixture,
  "/v5/real-world-assets/quotes/latest": quotesLatestFixture,
  "/v5/real-world-assets/issuers/list": issuersListFixture,
  "/v5/real-world-assets/issuers": issuerFixture,
};

function fixtureFetch() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(
      input instanceof Request ? input.url : input.toString(),
    );
    const fixture = fixturesByPath[url.pathname];
    return fixture
      ? Response.json(fixture)
      : Response.json({ message: "not found" }, { status: 404 });
  });
}

describe("CMC client", () => {
  it("calls and validates all seven RWA endpoints", async () => {
    const fetchMock = fixtureFetch();
    const client = createCmcClient({ apiKey: "test-key", fetch: fetchMock });

    const results = await Promise.all([
      client.getRwaMap({ assetType: "government_security" }),
      client.getRwaInfo({ rwaId: "101" }),
      client.getRwaAssets({ assetType: "government_security" }),
      client.getRwaMarketPairs({ rwaId: "101" }),
      client.getRwaQuotesLatest({ rwaId: "101" }),
      client.getRwaIssuers(),
      client.getRwaIssuer({ issuerId: "6878977dcbbf471de3366e85" }),
    ]);

    expect(results).toHaveLength(7);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(results[0].data.rwa_assets[0]?.asset_type).toBe(
      "government_security",
    );
    expect(results[3].data.market_pairs[0]?.market_pair).toBe("EXTBX/USDT");
    expect(results[6].data.tokens[0]?.rwa_id).toBe(101);

    const [assetsUrl, assetsInit] = fetchMock.mock.calls[2] as unknown as [
      URL,
      RequestInit,
    ];
    expect(assetsUrl.searchParams.get("asset_type")).toBe(
      "government_security",
    );
    expect(assetsUrl.searchParams.get("convert")).toBe("USD");
    expect(assetsUrl.toString()).not.toContain("test-key");
    expect(new Headers(assetsInit.headers).get("X-CMC_PRO_API_KEY")).toBe(
      "test-key",
    );
  });

  it("rejects invalid identifier combinations before fetching", async () => {
    const fetchMock = fixtureFetch();
    const client = createCmcClient({ apiKey: "test-key", fetch: fetchMock });

    expect(() => client.getRwaInfo({ rwaId: "101", symbol: "EXTB" })).toThrow(
      "Exactly one of rwaId, rwaSlug, or symbol is required",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deduplicates identical in-flight requests", async () => {
    const fetchMock = fixtureFetch();
    const client = createCmcClient({ apiKey: "test-key", fetch: fetchMock });

    const first = client.getRwaAssets({ assetType: "government_security" });
    const second = client.getRwaAssets({ assetType: "government_security" });

    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries retryable upstream failures with bounded backoff", async () => {
    const sleep = vi.fn(async () => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ message: "unavailable" }, { status: 500 }),
      )
      .mockResolvedValueOnce(
        Response.json({ message: "unavailable" }, { status: 500 }),
      )
      .mockResolvedValueOnce(
        Response.json(mapFixture),
      ) as unknown as typeof fetch;
    const client = createCmcClient({
      apiKey: "test-key",
      fetch: fetchMock,
      sleep,
      random: () => 0,
      baseDelayMs: 250,
      maxAttempts: 3,
    });

    await expect(client.getRwaMap()).resolves.toMatchObject({
      status: { error_code: 0 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 250);
    expect(sleep).toHaveBeenNthCalledWith(2, 500);
  });

  it("retries non-JSON 500 responses and respects Retry-After", async () => {
    const sleep = vi.fn(async () => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("upstream unavailable", {
          status: 500,
          headers: { "Retry-After": "2" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json(mapFixture),
      ) as unknown as typeof fetch;
    const client = createCmcClient({
      apiKey: "test-key",
      fetch: fetchMock,
      sleep,
      maxAttempts: 2,
    });

    await expect(client.getRwaMap()).resolves.toMatchObject({
      status: { error_code: 0 },
    });
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("does not retry authentication failures", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ message: "unauthorized" }, { status: 401 }),
    ) as unknown as typeof fetch;
    const client = createCmcClient({ apiKey: "test-key", fetch: fetchMock });

    await expect(client.getRwaMap()).rejects.toMatchObject({
      code: "CMC_UNAUTHORIZED",
      retryable: false,
      attempts: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports invalid successful responses", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ data: {} }),
    ) as unknown as typeof fetch;
    const client = createCmcClient({ apiKey: "test-key", fetch: fetchMock });

    await expect(client.getRwaMap()).rejects.toMatchObject({
      code: "CMC_INVALID_RESPONSE",
      retryable: false,
    });
  });

  it("retries timed out requests up to the configured cap", async () => {
    const fetchMock = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      },
    ) as unknown as typeof fetch;
    const client = createCmcClient({
      apiKey: "test-key",
      fetch: fetchMock,
      timeoutMs: 1,
      maxAttempts: 2,
      sleep: async () => undefined,
    });

    await expect(client.getRwaMap()).rejects.toMatchObject({
      code: "CMC_TIMEOUT",
      retryable: true,
      attempts: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("redactSensitive", () => {
  it("redacts sensitive keys regardless of casing and handles nested values", () => {
    expect(
      redactSensitive({
        "X-CMC_PRO_API_KEY": "top-secret",
        nested: {
          Authorization: "Bearer secret",
          safe: "visible",
        },
      }),
    ).toEqual({
      "X-CMC_PRO_API_KEY": "[REDACTED]",
      nested: {
        Authorization: "[REDACTED]",
        safe: "visible",
      },
    });
  });
});

it("exposes typed CMC errors", () => {
  const error = new CmcApiError({
    code: "CMC_RATE_LIMITED",
    message: "rate limited",
    status: 429,
    retryable: true,
    attempts: 3,
  });
  expect(error).toBeInstanceOf(Error);
});
