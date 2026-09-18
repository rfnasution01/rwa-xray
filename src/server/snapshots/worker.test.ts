import { describe, expect, it, vi } from "vitest";

import assetsListFixture from "../../../tests/fixtures/cmc/rwa-assets-list.json";
import quotesFixture from "../../../tests/fixtures/cmc/rwa-quotes-latest.json";
import type { CacheResult, CacheState } from "@/server/cache/service";
import { CmcApiError } from "@/server/cmc/error";
import {
  normalizeRwaAssetsList,
  normalizeRwaQuotesLatest,
} from "@/server/cmc/normalize";
import {
  rwaAssetsListResponseSchema,
  rwaQuotesLatestResponseSchema,
} from "@/server/cmc/schemas";
import type { RwaRepository } from "@/server/repositories/rwa-repository";

import type { SnapshotStore } from "./store";
import { createSnapshotWorker } from "./worker";

const observedAt = new Date("2026-09-09T07:00:00.000Z");

function cache<T>(value: T, state: CacheState = "fresh"): CacheResult<T> {
  return {
    value,
    cache: {
      key: "not-exposed-by-report",
      state,
      observedAt: observedAt.toISOString(),
      expiresAt: "2026-09-09T07:01:00.000Z",
      staleUntil: "2026-09-10T07:00:00.000Z",
      warning: null,
    },
    refreshError: null,
  };
}

function datasets() {
  const assets = normalizeRwaAssetsList(
    rwaAssetsListResponseSchema.parse(assetsListFixture),
    { observedAt },
  );
  const quotes = normalizeRwaQuotesLatest(
    rwaQuotesLatestResponseSchema.parse(quotesFixture),
    { observedAt },
  );
  return { assets, quotes };
}

function repository(): RwaRepository {
  const { assets, quotes } = datasets();
  return {
    getMap: vi.fn(),
    getInfo: vi.fn(),
    getAssets: vi.fn(async () => cache(assets)),
    getMarketPairs: vi.fn(),
    getQuotesLatest: vi.fn(async () => cache(quotes)),
    getIssuers: vi.fn(),
    getIssuer: vi.fn(),
  };
}

function store(activeIds: number[] = []): SnapshotStore {
  return {
    upsertAssets: vi.fn(async () => undefined),
    getRecentlyViewedAssetIds: vi.fn(async () => activeIds),
    saveAssetSnapshot: vi.fn(async () => undefined),
  };
}

describe("adaptive snapshot worker", () => {
  it("upserts a de-duplicated broad asset batch", async () => {
    const data = repository();
    const snapshots = store();
    const worker = createSnapshotWorker({
      repository: data,
      store: snapshots,
      now: () => observedAt,
    });

    const result = await worker.runBroad();

    expect(result).toMatchObject({
      mode: "broad",
      status: "success",
      assetsDiscovered: 1,
      assetsPersisted: 1,
      snapshotsPersisted: 0,
    });
    expect(snapshots.upsertAssets).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ rwaId: 101 })]),
      observedAt,
    );
  });

  it("records a partial analysis snapshot when market pairs are forbidden", async () => {
    const data = repository();
    vi.mocked(data.getMarketPairs).mockRejectedValue(
      new CmcApiError({
        code: "CMC_FORBIDDEN",
        message: "safe test error",
        status: 403,
        retryable: false,
        attempts: 1,
      }),
    );
    const snapshots = store();
    const worker = createSnapshotWorker({
      repository: data,
      store: snapshots,
      now: () => observedAt,
    });

    const result = await worker.runPriority();

    expect(result).toMatchObject({
      mode: "priority",
      status: "partial",
      assetsDiscovered: 1,
      snapshotsPersisted: 1,
      issues: [
        {
          code: "MARKET_PAIRS_UNAVAILABLE",
          source: "marketPairs",
          rwaId: 101,
        },
      ],
    });
    expect(snapshots.saveAssetSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        marketPairs: null,
        pairObservedAt: null,
        analysis: expect.objectContaining({
          inputSnapshotIds: ["quote:101:2026-09-09T07:00:00.000Z"],
          concentration: expect.objectContaining({
            market: expect.objectContaining({ status: "unavailable" }),
          }),
        }),
      }),
    );
  });

  it("opens the pair circuit after an entitlement error", async () => {
    const data = repository();
    const { quotes } = datasets();
    const first = quotes.data[0]!;
    vi.mocked(data.getQuotesLatest).mockResolvedValueOnce(
      cache({
        ...quotes,
        data: [
          first,
          {
            ...first,
            rwaId: 102,
            name: "Second Asset",
            symbol: "SECOND",
            slug: "second-asset",
          },
        ],
      }),
    );
    vi.mocked(data.getMarketPairs).mockRejectedValueOnce(
      new CmcApiError({
        code: "CMC_FORBIDDEN",
        message: "safe test error",
        status: 403,
        retryable: false,
        attempts: 1,
      }),
    );
    const snapshots = store([102]);
    const worker = createSnapshotWorker({
      repository: data,
      store: snapshots,
      now: () => observedAt,
    });

    const result = await worker.runPriority();

    expect(data.getMarketPairs).toHaveBeenCalledTimes(1);
    expect(
      result.issues.filter((issue) => issue.source === "marketPairs"),
    ).toHaveLength(2);
    expect(snapshots.saveAssetSnapshot).toHaveBeenCalledTimes(2);
  });

  it("does not create artificial points when no priority asset exists", async () => {
    const data = repository();
    const { assets } = datasets();
    vi.mocked(data.getAssets).mockResolvedValueOnce(
      cache({ ...assets, data: { ...assets.data, items: [] } }),
    );
    const snapshots = store();
    const worker = createSnapshotWorker({
      repository: data,
      store: snapshots,
      now: () => observedAt,
    });

    const result = await worker.runPriority();

    expect(result.status).toBe("partial");
    expect(result.issues).toContainEqual({
      code: "NO_PRIORITY_ASSETS",
      source: "assets",
      rwaId: null,
    });
    expect(data.getQuotesLatest).not.toHaveBeenCalled();
  });
});
