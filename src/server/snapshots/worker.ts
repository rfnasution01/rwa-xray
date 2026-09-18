import "server-only";

import { analyzeAsset, type BenchmarkObservation } from "@/domain/analysis";
import type { ListedAsset, MarketPairs } from "@/domain/assets/models";
import type { CacheResult } from "@/server/cache/service";
import { CmcApiError } from "@/server/cmc/error";
import {
  getRwaRepository,
  type RwaRepository,
} from "@/server/repositories/rwa-repository";

import { createPostgresSnapshotStore, type SnapshotStore } from "./store";

const PRIORITY_GOVERNMENT_LIMIT = 10;
const ACTIVE_ASSET_LIMIT = 20;
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
const BROAD_LIMIT = 250;

export type SnapshotWorkerIssueCode =
  | "ASSET_NOT_RETURNED"
  | "MARKET_PAIRS_UNAVAILABLE"
  | "NO_PRIORITY_ASSETS"
  | "SNAPSHOT_WRITE_FAILED";

export type SnapshotWorkerIssue = {
  code: SnapshotWorkerIssueCode;
  source: "assets" | "quotes" | "marketPairs" | "database";
  rwaId: number | null;
};

export type SnapshotRunReport = {
  mode: "broad" | "priority";
  status: "success" | "partial" | "failure";
  startedAt: string;
  completedAt: string;
  assetsDiscovered: number;
  assetsPersisted: number;
  snapshotsPersisted: number;
  staleSourcesUsed: boolean;
  issues: SnapshotWorkerIssue[];
};

export type SnapshotWorker = {
  runBroad(): Promise<SnapshotRunReport>;
  runPriority(): Promise<SnapshotRunReport>;
};

export function createSnapshotWorker(options: {
  repository: RwaRepository;
  store: SnapshotStore;
  now?: () => Date;
}): SnapshotWorker {
  const now = options.now ?? (() => new Date());

  return {
    async runBroad() {
      const startedAt = validNow(now);
      const [globalResult, governmentResult] = await Promise.all([
        options.repository.getAssets({
          sort: "rwa_rank",
          sortDir: "asc",
          limit: BROAD_LIMIT,
          convert: "USD",
          skipInvalid: true,
        }),
        options.repository.getAssets({
          assetType: "government_security",
          sort: "tokenized_volume_24h",
          sortDir: "desc",
          limit: BROAD_LIMIT,
          convert: "USD",
          skipInvalid: true,
        }),
      ]);
      const assets = uniqueAssets([
        ...globalResult.value.data.items,
        ...governmentResult.value.data.items,
      ]);
      const observedAt = latestDate([
        globalResult.value.evidence.observedAt,
        governmentResult.value.evidence.observedAt,
      ]);
      const issues: SnapshotWorkerIssue[] = [];
      let persisted = 0;
      try {
        await options.store.upsertAssets(assets, observedAt);
        persisted = assets.length;
      } catch {
        issues.push({
          code: "SNAPSHOT_WRITE_FAILED",
          source: "database",
          rwaId: null,
        });
      }

      return report({
        mode: "broad",
        startedAt: startedAt.toISOString(),
        completedAt: validNow(now).toISOString(),
        assetsDiscovered: assets.length,
        assetsPersisted: persisted,
        snapshotsPersisted: 0,
        staleSourcesUsed:
          globalResult.cache.state === "stale" ||
          governmentResult.cache.state === "stale",
        issues,
      });
    },

    async runPriority() {
      const startedAt = validNow(now);
      const activeSince = new Date(startedAt.getTime() - ACTIVE_WINDOW_MS);
      const [governmentResult, activeIds] = await Promise.all([
        options.repository.getAssets({
          assetType: "government_security",
          sort: "tokenized_volume_24h",
          sortDir: "desc",
          limit: PRIORITY_GOVERNMENT_LIMIT,
          convert: "USD",
          skipInvalid: true,
        }),
        options.store.getRecentlyViewedAssetIds({
          since: activeSince,
          limit: ACTIVE_ASSET_LIMIT,
        }),
      ]);
      const governmentAssets = governmentResult.value.data.items;
      const priorityIds = uniqueNumbers([
        ...governmentAssets.map((asset) => asset.rwaId),
        ...activeIds,
      ]);
      const issues: SnapshotWorkerIssue[] = [];

      if (priorityIds.length === 0) {
        issues.push({
          code: "NO_PRIORITY_ASSETS",
          source: "assets",
          rwaId: null,
        });
        return report({
          mode: "priority",
          startedAt: startedAt.toISOString(),
          completedAt: validNow(now).toISOString(),
          assetsDiscovered: 0,
          assetsPersisted: 0,
          snapshotsPersisted: 0,
          staleSourcesUsed: governmentResult.cache.state === "stale",
          issues,
        });
      }

      const quotesResult = await options.repository.getQuotesLatest({
        rwaId: priorityIds.join(","),
        convert: "USD",
        skipInvalid: true,
      });
      const quoteObservedAt = new Date(quotesResult.value.evidence.observedAt);
      const pairResults = await loadMarketPairs(
        priorityIds,
        options.repository,
        issues,
      );
      const benchmarks = benchmarkObservations(governmentAssets, pairResults);
      let persisted = 0;

      for (const rwaId of priorityIds) {
        const asset = quotesResult.value.data.find(
          (candidate) => candidate.rwaId === rwaId,
        );
        if (!asset) {
          issues.push({ code: "ASSET_NOT_RETURNED", source: "quotes", rwaId });
          continue;
        }
        const pairResult = pairResults.get(rwaId) ?? null;
        const marketPairs = pairResult?.value.data ?? null;
        const pairObservedAt = pairResult
          ? new Date(pairResult.value.evidence.observedAt)
          : null;
        const inputSnapshotIds = [
          snapshotId("quote", rwaId, quoteObservedAt),
          ...(pairObservedAt
            ? [snapshotId("market-pairs", rwaId, pairObservedAt)]
            : []),
        ];
        const analysis = analyzeAsset({
          asset,
          marketPairs,
          benchmarks,
          calculatedAt: quoteObservedAt,
          inputSnapshotIds,
        });

        try {
          await options.store.saveAssetSnapshot({
            asset,
            marketPairs,
            analysis,
            observedAt: quoteObservedAt,
            pairObservedAt,
          });
          persisted += 1;
        } catch {
          issues.push({
            code: "SNAPSHOT_WRITE_FAILED",
            source: "database",
            rwaId,
          });
        }
      }

      return report({
        mode: "priority",
        startedAt: startedAt.toISOString(),
        completedAt: validNow(now).toISOString(),
        assetsDiscovered: priorityIds.length,
        assetsPersisted: persisted,
        snapshotsPersisted: persisted,
        staleSourcesUsed:
          governmentResult.cache.state === "stale" ||
          quotesResult.cache.state === "stale" ||
          [...pairResults.values()].some(
            (result) => result.cache.state === "stale",
          ),
        issues,
      });
    },
  };
}

async function loadMarketPairs(
  rwaIds: readonly number[],
  repository: RwaRepository,
  issues: SnapshotWorkerIssue[],
) {
  const results = new Map<
    number,
    Awaited<ReturnType<RwaRepository["getMarketPairs"]>>
  >();
  let circuitOpen = false;

  for (const rwaId of rwaIds) {
    if (circuitOpen) {
      issues.push({
        code: "MARKET_PAIRS_UNAVAILABLE",
        source: "marketPairs",
        rwaId,
      });
      continue;
    }
    try {
      results.set(
        rwaId,
        await repository.getMarketPairs({
          rwaId: String(rwaId),
          sort: "volume_24h",
          sortDir: "desc",
          limit: 250,
          convert: "USD",
        }),
      );
    } catch (error) {
      issues.push({
        code: "MARKET_PAIRS_UNAVAILABLE",
        source: "marketPairs",
        rwaId,
      });
      circuitOpen =
        error instanceof CmcApiError &&
        (error.code === "CMC_UNAUTHORIZED" ||
          error.code === "CMC_FORBIDDEN" ||
          error.code === "CMC_RATE_LIMITED");
    }
  }
  return results;
}

function benchmarkObservations(
  assets: readonly ListedAsset[],
  pairResults: ReadonlyMap<number, CacheResult<{ data: MarketPairs }>>,
): BenchmarkObservation[] {
  return assets.map((asset) => ({
    rwaId: asset.rwaId,
    assetType: asset.assetType,
    marketCap: asset.quote.tokenizedMarketCap,
    volume24h: asset.quote.tokenizedVolume24h,
    marketPairCount:
      pairResults.get(asset.rwaId)?.value.data.pairs.length ?? null,
  }));
}

function uniqueAssets(assets: readonly ListedAsset[]) {
  const unique = new Map<number, ListedAsset>();
  for (const asset of assets) unique.set(asset.rwaId, asset);
  return [...unique.values()];
}

function uniqueNumbers(values: readonly number[]) {
  return [...new Set(values)];
}

function latestDate(values: readonly string[]) {
  return new Date(
    Math.max(...values.map((value) => new Date(value).getTime())),
  );
}

function snapshotId(
  source: "quote" | "market-pairs",
  rwaId: number,
  observedAt: Date,
) {
  return `${source}:${rwaId}:${observedAt.toISOString()}`;
}

function validNow(now: () => Date) {
  const value = now();
  if (!Number.isFinite(value.getTime())) {
    throw new TypeError("Snapshot worker clock returned an invalid Date");
  }
  return value;
}

function report(input: Omit<SnapshotRunReport, "status">): SnapshotRunReport {
  const hasDatabaseFailure = input.issues.some(
    (issue) => issue.code === "SNAPSHOT_WRITE_FAILED",
  );
  const status =
    hasDatabaseFailure && input.assetsPersisted === 0
      ? "failure"
      : input.issues.length > 0
        ? "partial"
        : "success";
  return { ...input, status };
}

let singleton: SnapshotWorker | undefined;

export function getSnapshotWorker() {
  singleton ??= createSnapshotWorker({
    repository: getRwaRepository(),
    store: createPostgresSnapshotStore(),
  });
  return singleton;
}
