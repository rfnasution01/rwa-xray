import { describe, expect, it, vi } from "vitest";

import assetsListFixture from "../../../tests/fixtures/cmc/rwa-assets-list.json";
import infoFixture from "../../../tests/fixtures/cmc/rwa-info.json";
import issuerFixture from "../../../tests/fixtures/cmc/rwa-issuer.json";
import issuersListFixture from "../../../tests/fixtures/cmc/rwa-issuers-list.json";
import mapFixture from "../../../tests/fixtures/cmc/rwa-map.json";
import marketPairsFixture from "../../../tests/fixtures/cmc/rwa-market-pairs.json";
import quotesLatestFixture from "../../../tests/fixtures/cmc/rwa-quotes-latest.json";
import type { CacheResult, CacheState } from "@/server/cache/service";
import {
  normalizeRwaAssetsList,
  normalizeRwaInfo,
  normalizeRwaIssuer,
  normalizeRwaIssuersList,
  normalizeRwaMap,
  normalizeRwaMarketPairs,
  normalizeRwaQuotesLatest,
} from "@/server/cmc/normalize";
import {
  rwaAssetsListResponseSchema,
  rwaInfoResponseSchema,
  rwaIssuerResponseSchema,
  rwaIssuersListResponseSchema,
  rwaMapResponseSchema,
  rwaMarketPairsResponseSchema,
  rwaQuotesLatestResponseSchema,
} from "@/server/cmc/schemas";
import type { RwaRepository } from "@/server/repositories/rwa-repository";

import {
  ApplicationServiceError,
  createRwaApplicationService,
} from "./rwa-service";

const observedAt = new Date("2026-09-09T06:59:30.000Z");
const calculatedAt = new Date("2026-09-09T07:00:00.000Z");

function cached<T>(value: T, state: CacheState = "fresh"): CacheResult<T> {
  return {
    value,
    cache: {
      key: "internal-cache-key",
      state,
      observedAt: observedAt.toISOString(),
      expiresAt: "2026-09-09T07:01:00.000Z",
      staleUntil: "2026-09-10T06:59:30.000Z",
      warning: null,
    },
    refreshError:
      state === "stale"
        ? {
            code: "CMC_UPSTREAM_ERROR",
            message: "Upstream refresh failed; serving the last cached dataset",
          }
        : null,
  };
}

function repository(): RwaRepository {
  return {
    getMap: vi.fn(async () =>
      cached(
        normalizeRwaMap(rwaMapResponseSchema.parse(mapFixture), { observedAt }),
      ),
    ),
    getInfo: vi.fn(async () =>
      cached(
        normalizeRwaInfo(rwaInfoResponseSchema.parse(infoFixture), {
          observedAt,
        }),
      ),
    ),
    getAssets: vi.fn(async () =>
      cached(
        normalizeRwaAssetsList(
          rwaAssetsListResponseSchema.parse(assetsListFixture),
          { observedAt },
        ),
      ),
    ),
    getMarketPairs: vi.fn(async () =>
      cached(
        normalizeRwaMarketPairs(
          rwaMarketPairsResponseSchema.parse(marketPairsFixture),
          { observedAt },
        ),
      ),
    ),
    getQuotesLatest: vi.fn(async () =>
      cached(
        normalizeRwaQuotesLatest(
          rwaQuotesLatestResponseSchema.parse(quotesLatestFixture),
          { observedAt },
        ),
      ),
    ),
    getIssuers: vi.fn(async () =>
      cached(
        normalizeRwaIssuersList(
          rwaIssuersListResponseSchema.parse(issuersListFixture),
          { observedAt },
        ),
      ),
    ),
    getIssuer: vi.fn(async () =>
      cached(
        normalizeRwaIssuer(rwaIssuerResponseSchema.parse(issuerFixture), {
          observedAt,
        }),
      ),
    ),
  };
}

describe("RWA application service", () => {
  it("returns a safe explorer DTO with derived turnover", async () => {
    const data = repository();
    const service = createRwaApplicationService({
      repository: data,
      now: () => calculatedAt,
    });

    const result = await service.getExplorer({
      assetType: "government_security",
      limit: 20,
    });

    expect(result.items[0]).toMatchObject({
      rwaId: 101,
      turnoverRatio: 0.05,
    });
    expect(result.sourceStatus.cache).not.toHaveProperty("key");
    expect(result.sourceStatus.evidence.endpoint).toBe(
      "/v5/real-world-assets/assets/list",
    );
    expect(data.getAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        assetType: "government_security",
        convert: "USD",
        limit: 20,
      }),
    );
  });

  it("loads bounded initial candidates and performs targeted Compare search", async () => {
    const data = repository();
    const service = createRwaApplicationService({ repository: data });

    const initial = await service.getCompareUniverse();
    expect(initial.items.length).toBeGreaterThan(0);
    expect(data.getAssets).toHaveBeenCalledWith(
      expect.objectContaining({ start: 1, limit: 50 }),
    );
    expect(data.getMap).not.toHaveBeenCalled();

    const result = await service.getCompareUniverse("EXTB");

    expect(result.items.map((item) => item.rwaId)).toContain(101);
    expect(data.getMap).toHaveBeenCalledTimes(1);
    expect(data.getMap).toHaveBeenCalledWith({ symbol: "extb", limit: 50 });
    expect(data.getAssets).toHaveBeenCalledTimes(3);
    expect(data.getAssets).toHaveBeenCalledWith(
      expect.objectContaining({ rwaSlug: "extb", limit: 50 }),
    );
    expect(data.getAssets).toHaveBeenCalledWith(
      expect.objectContaining({ start: 1, limit: 250 }),
    );
  });

  it("returns issuer directory and detail DTOs without cache keys", async () => {
    const data = repository();
    const service = createRwaApplicationService({ repository: data });

    const directory = await service.getIssuerDirectory({
      active: true,
      start: 1,
      limit: 24,
    });
    const detail = await service.getIssuerDetail({
      issuerId: "6878977dcbbf471de3366e85",
      start: 1,
      limit: 100,
    });

    expect(directory.items[0]).toMatchObject({
      issuerId: "6878977dcbbf471de3366e85",
      name: "Example Issuer",
      tokenCount: 1,
    });
    expect(detail.issuer.tokens[0]).toMatchObject({
      cryptoId: 40101,
      rwaId: 101,
    });
    expect(data.getIssuers).toHaveBeenCalledWith({
      active: true,
      start: 1,
      limit: 24,
    });
    expect(data.getIssuer).toHaveBeenCalledWith({
      issuerId: "6878977dcbbf471de3366e85",
      start: 1,
      limit: 100,
    });
    expect(JSON.stringify({ directory, detail })).not.toContain(
      "internal-cache-key",
    );
  });

  it("orchestrates detail sources and analysis without exposing cache keys", async () => {
    const data = repository();
    const service = createRwaApplicationService({
      repository: data,
      now: () => calculatedAt,
    });

    const result = await service.getAssetDetail({
      rwaId: 101,
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });

    expect(result.asset.rwaId).toBe(101);
    expect(result.metadata?.rwaId).toBe(101);
    expect(result.marketPairs?.pairs).toHaveLength(1);
    expect(result.analysis.scenario).toMatchObject({
      status: "available",
      estimatedExitDays: 4,
    });
    expect(result.sourceStatuses).toHaveLength(4);
    expect(JSON.stringify(result)).not.toContain("internal-cache-key");
    expect(result.dataGaps).toEqual([]);
  });

  it("loads every market-pair page before analysis", async () => {
    const data = repository();
    const base = await data.getMarketPairs({ rwaId: "101" });
    const pair = base.value.data.pairs[0]!;
    const firstPagePairs = Array.from({ length: 250 }, (_, index) => ({
      ...pair,
      marketId: pair.marketId + index,
      marketPair: `${pair.marketPair}-${index + 1}`,
    }));
    const finalPair = {
      ...pair,
      marketId: pair.marketId + 250,
      marketPair: `${pair.marketPair}-251`,
    };
    vi.mocked(data.getMarketPairs).mockReset();
    vi.mocked(data.getMarketPairs)
      .mockResolvedValueOnce({
        ...base,
        value: {
          ...base.value,
          data: {
            ...base.value.data,
            pairs: firstPagePairs,
            totalSize: 251,
            hasMore: true,
          },
        },
      })
      .mockResolvedValueOnce({
        ...base,
        value: {
          ...base.value,
          data: {
            ...base.value.data,
            pairs: [finalPair],
            totalSize: 251,
            hasMore: false,
          },
        },
      });
    const service = createRwaApplicationService({
      repository: data,
      now: () => calculatedAt,
    });

    const result = await service.getAssetDetail({
      rwaId: 101,
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });

    expect(result.marketPairs?.pairs).toHaveLength(251);
    expect(data.getMarketPairs).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ start: 1, limit: 250 }),
    );
    expect(data.getMarketPairs).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ start: 251, limit: 250 }),
    );
    expect(result.sourceStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "marketPairs",
          evidence: expect.objectContaining({ creditCount: 2 }),
        }),
      ]),
    );
  });

  it("withholds market-pair analysis when a later page fails", async () => {
    const data = repository();
    const base = await data.getMarketPairs({ rwaId: "101" });
    const pair = base.value.data.pairs[0]!;
    vi.mocked(data.getMarketPairs).mockReset();
    vi.mocked(data.getMarketPairs)
      .mockResolvedValueOnce({
        ...base,
        value: {
          ...base.value,
          data: {
            ...base.value.data,
            pairs: Array.from({ length: 250 }, (_, index) => ({
              ...pair,
              marketId: pair.marketId + index,
            })),
            totalSize: 251,
            hasMore: true,
          },
        },
      })
      .mockRejectedValueOnce(new Error("second page unavailable"));
    const service = createRwaApplicationService({
      repository: data,
      now: () => calculatedAt,
    });

    const result = await service.getAssetDetail({
      rwaId: 101,
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });

    expect(result.marketPairs).toBeNull();
    expect(result.dataGaps).toContainEqual({
      source: "marketPairs",
      code: "SOURCE_UNAVAILABLE",
    });
    expect(result.analysis.concentration.market.status).toBe("unavailable");
  });

  it("records a valid detail view without making activity tracking critical", async () => {
    const data = repository();
    const activityRecorder = {
      recordView: vi.fn(async () => {
        throw new Error("activity database unavailable");
      }),
    };
    const service = createRwaApplicationService({
      repository: data,
      activityRecorder,
      now: () => calculatedAt,
    });

    const result = await service.getAssetDetail({
      rwaId: 101,
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });

    expect(result.asset.rwaId).toBe(101);
    expect(activityRecorder.recordView).toHaveBeenCalledWith(
      expect.objectContaining({ rwaId: 101 }),
    );
  });

  it("keeps detail usable when optional sources fail", async () => {
    const data = repository();
    vi.mocked(data.getInfo).mockRejectedValueOnce(
      new Error("metadata unavailable"),
    );
    vi.mocked(data.getMarketPairs).mockRejectedValueOnce(
      new Error("pairs unavailable"),
    );
    vi.mocked(data.getAssets).mockRejectedValueOnce(
      new Error("benchmark unavailable"),
    );
    const service = createRwaApplicationService({
      repository: data,
      now: () => calculatedAt,
    });

    const result = await service.getAssetDetail({
      rwaId: 101,
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });

    expect(result.asset.rwaId).toBe(101);
    expect(result.metadata).toBeNull();
    expect(result.marketPairs).toBeNull();
    expect(result.dataGaps).toEqual(
      expect.arrayContaining([
        { source: "metadata", code: "SOURCE_UNAVAILABLE" },
        { source: "marketPairs", code: "SOURCE_UNAVAILABLE" },
        { source: "assets", code: "SOURCE_UNAVAILABLE" },
      ]),
    );
  });

  it("compares assets with one shared scenario and sorts available exit days", async () => {
    const data = repository();
    const quotes = await data.getQuotesLatest({ rwaId: "101" });
    const first = quotes.value.data[0]!;
    vi.mocked(data.getQuotesLatest).mockResolvedValue({
      ...quotes,
      value: {
        ...quotes.value,
        data: [
          first,
          {
            ...first,
            rwaId: 102,
            name: "Lower Capacity Asset",
            symbol: "LOW",
            slug: "lower-capacity-asset",
            quote: { ...first.quote, tokenizedVolume24h: 25_000 },
          },
        ],
      },
    });
    vi.mocked(data.getQuotesLatest).mockClear();
    const service = createRwaApplicationService({
      repository: data,
      now: () => calculatedAt,
    });

    const result = await service.compareAssets({
      rwaIds: [102, 101],
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });

    expect(result.items.map((item) => item.asset.rwaId)).toEqual([101, 102]);
    expect(result.scenario).toEqual({
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });
    expect(result.failures).toEqual([]);
    expect(data.getQuotesLatest).toHaveBeenCalledTimes(1);
    expect(data.getQuotesLatest).toHaveBeenCalledWith({
      rwaId: "102,101",
      convert: "USD",
      skipInvalid: true,
    });
    expect(data.getInfo).toHaveBeenCalledTimes(1);
    expect(data.getInfo).toHaveBeenCalledWith({
      rwaId: "102,101",
      skipInvalid: true,
    });
    expect(data.getAssets).toHaveBeenCalledTimes(1);
    expect(data.getMarketPairs).toHaveBeenCalledTimes(2);
  });

  it("keeps successful batch results when one quote is not returned", async () => {
    const data = repository();
    const service = createRwaApplicationService({
      repository: data,
      now: () => calculatedAt,
    });

    const result = await service.compareAssets({
      rwaIds: [101, 102],
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });

    expect(result.items.map((item) => item.asset.rwaId)).toEqual([101]);
    expect(result.failures).toEqual([{ rwaId: 102, code: "ASSET_NOT_FOUND" }]);
    expect(data.getQuotesLatest).toHaveBeenCalledTimes(1);
    expect(data.getInfo).toHaveBeenCalledTimes(1);
    expect(data.getAssets).toHaveBeenCalledTimes(1);
    expect(data.getMarketPairs).toHaveBeenCalledTimes(1);
    expect(data.getMarketPairs).toHaveBeenCalledWith(
      expect.objectContaining({ rwaId: "101" }),
    );
  });

  it("does not request market pairs when the batched quote source fails", async () => {
    const data = repository();
    vi.mocked(data.getQuotesLatest).mockRejectedValueOnce(
      new Error("quote batch unavailable"),
    );
    const service = createRwaApplicationService({ repository: data });

    const result = await service.compareAssets({
      rwaIds: [101, 102],
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });

    expect(result.items).toEqual([]);
    expect(result.failures).toEqual([
      { rwaId: 101, code: "REQUIRED_SOURCE_UNAVAILABLE" },
      { rwaId: 102, code: "REQUIRED_SOURCE_UNAVAILABLE" },
    ]);
    expect(data.getQuotesLatest).toHaveBeenCalledTimes(1);
    expect(data.getMarketPairs).not.toHaveBeenCalled();
  });

  it("returns sanitized evidence parameters, lineage, and excerpts", async () => {
    const data = repository();
    const service = createRwaApplicationService({
      repository: data,
      now: () => calculatedAt,
    });

    const result = await service.getAssetEvidence({
      rwaId: 101,
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });

    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "quotes",
          parameters: { rwaId: 101, convert: "USD" },
          features: expect.arrayContaining(["exit capacity"]),
        }),
      ]),
    );
    expect(result.metricLineage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: "estimatedExitDays" }),
      ]),
    );
    expect(result.excerpt).toMatchObject({
      currency: "USD",
      tokenCount: 1,
      marketPairCount: 1,
    });
    expect(JSON.stringify(result)).not.toContain("internal-cache-key");
  });

  it("fails safely when the required quote source is unavailable", async () => {
    const data = repository();
    vi.mocked(data.getQuotesLatest).mockRejectedValueOnce(
      new Error("secret upstream detail"),
    );
    const service = createRwaApplicationService({ repository: data });

    await expect(
      service.getAssetDetail({
        rwaId: 101,
        positionValue: 100_000,
        participationRate: 0.05,
        stressHaircut: 0,
      }),
    ).rejects.toMatchObject({
      code: "REQUIRED_SOURCE_UNAVAILABLE",
    } satisfies Partial<ApplicationServiceError>);
  });

  it("marks the complete response stale when a required dataset is stale", async () => {
    const data = repository();
    const staleQuote = await data.getQuotesLatest({ rwaId: "101" });
    vi.mocked(data.getQuotesLatest).mockResolvedValueOnce({
      ...staleQuote,
      cache: { ...staleQuote.cache, state: "stale" },
    });
    const service = createRwaApplicationService({
      repository: data,
      now: () => calculatedAt,
    });

    const result = await service.getAssetDetail({
      rwaId: 101,
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });
    expect(result.stale).toBe(true);
  });
});
