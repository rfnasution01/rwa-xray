import { afterAll, describe, expect, it } from "vitest";

import { createPostgresCacheStore } from "@/server/cache/store";
import { createCmcClient } from "@/server/cmc/client";
import { CmcApiError } from "@/server/cmc/error";
import {
  normalizeRwaAssetsList,
  normalizeRwaInfo,
  normalizeRwaIssuer,
  normalizeRwaIssuersList,
  normalizeRwaMap,
  normalizeRwaMarketPairs,
  normalizeRwaQuotesLatest,
} from "@/server/cmc/normalize";

const apiKey = requiredEnvironmentVariable("CMC_API_KEY");
requiredEnvironmentVariable("DATABASE_URL");

const client = createCmcClient({
  apiKey,
  baseUrl: process.env.CMC_API_BASE_URL,
  timeoutMs: 15_000,
});
const cacheStore = createPostgresCacheStore();
const verificationKey = `live-verification:${crypto.randomUUID()}`;

afterAll(async () => {
  try {
    await cacheStore.delete(verificationKey);
  } catch {
    // Cleanup is best-effort when the database itself is unavailable.
  }
});

describe("live infrastructure verification", () => {
  it("calls and normalizes all seven CoinMarketCap RWA endpoints", async () => {
    let stage = "map";
    try {
      const mapResponse = await client.getRwaMap({ limit: 250 });
      const map = normalizeRwaMap(mapResponse);
      const target =
        map.data.items.find(
          (asset) =>
            asset.assetType === "government_security" && asset.hasTokens,
        ) ??
        map.data.items.find((asset) => asset.hasTokens) ??
        map.data.items[0];
      expect(target, "CMC returned no RWA for verification").toBeDefined();
      const rwaId = String(target!.rwaId);

      stage = "info";
      const infoResponse = await client.getRwaInfo({ rwaId });
      stage = "assets-list";
      const assetsResponse = await client.getRwaAssets({
        rwaId,
        convert: "USD",
      });
      stage = "market-pairs";
      let pairs: ReturnType<typeof normalizeRwaMarketPairs> | null = null;
      let marketPairsAccessError: CmcApiError | null = null;
      try {
        pairs = normalizeRwaMarketPairs(
          await client.getRwaMarketPairs({
            rwaId,
            limit: 250,
            convert: "USD",
          }),
        );
      } catch (error) {
        if (error instanceof CmcApiError && error.code === "CMC_FORBIDDEN") {
          marketPairsAccessError = error;
        } else {
          throw error;
        }
      }
      stage = "quotes-latest";
      const quotesResponse = await client.getRwaQuotesLatest({
        rwaId,
        convert: "USD",
      });
      stage = "issuers-list";
      const issuersResponse = await client.getRwaIssuers({ limit: 1 });

      const info = normalizeRwaInfo(infoResponse);
      const assets = normalizeRwaAssetsList(assetsResponse);
      const quotes = normalizeRwaQuotesLatest(quotesResponse);
      const issuers = normalizeRwaIssuersList(issuersResponse);
      const issuer = issuers.data.items[0];
      expect(issuer, "CMC returned no issuer for verification").toBeDefined();
      stage = "issuer-detail";
      const issuerDetail = normalizeRwaIssuer(
        await client.getRwaIssuer({ issuerId: issuer!.issuerId, limit: 250 }),
      );

      expect(map.evidence.provider).toBe("coinmarketcap");
      expect(info.data.some((asset) => asset.rwaId === target!.rwaId)).toBe(
        true,
      );
      expect(
        assets.data.items.some((asset) => asset.rwaId === target!.rwaId),
      ).toBe(true);
      if (pairs) expect(pairs.data.rwaId).toBe(target!.rwaId);
      expect(quotes.data.some((asset) => asset.rwaId === target!.rwaId)).toBe(
        true,
      );
      expect(issuerDetail.data.issuerId).toBe(issuer!.issuerId);
      if (marketPairsAccessError) {
        stage = "market-pairs-access";
        throw marketPairsAccessError;
      }
    } catch (error) {
      const code =
        error instanceof CmcApiError
          ? error.code
          : "VERIFICATION_ASSERTION_FAILED";
      const schemaIssues =
        error instanceof CmcApiError && Array.isArray(error.details)
          ? error.details
              .map((issue: unknown) => {
                if (!issue || typeof issue !== "object") return "unknown issue";
                const candidate = issue as { code?: unknown; path?: unknown };
                const path = Array.isArray(candidate.path)
                  ? candidate.path.join(".")
                  : "unknown";
                return `${String(candidate.code ?? "unknown")} at ${path}`;
              })
              .slice(0, 10)
              .join(", ")
          : null;
      throw new Error(
        `CMC live verification failed at ${stage} (${code})${schemaIssues ? `: ${schemaIssues}` : ""}.`,
      );
    }
  });

  it("writes, reads, and deletes a PostgreSQL cache entry", async () => {
    const observedAt = new Date();
    try {
      await cacheStore.put({
        key: verificationKey,
        endpoint: "/live-verification",
        payload: { verified: true },
        observedAt,
        expiresAt: new Date(observedAt.getTime() + 60_000),
        staleUntil: new Date(observedAt.getTime() + 120_000),
      });
      const entry = await cacheStore.get(verificationKey);
      expect(entry?.payload).toEqual({ verified: true });
      await cacheStore.delete(verificationKey);
      await expect(cacheStore.get(verificationKey)).resolves.toBeNull();
    } catch (error) {
      const safeError =
        error && typeof error === "object"
          ? (error as { name?: unknown; code?: unknown })
          : null;
      const name = String(safeError?.name ?? "UnknownError");
      const code = String(safeError?.code ?? "NO_CODE");
      throw new Error(
        `Database live verification failed (${name}/${code}). Confirm DATABASE_URL and database availability.`,
      );
    }
  });
});

function requiredEnvironmentVariable(name: "CMC_API_KEY" | "DATABASE_URL") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for live verification`);
  }
  return value;
}
