import "server-only";

import type {
  AssetMetadata,
  DetailedAsset,
  IssuerDetail,
  IssuerSummary,
  ListedAsset,
  MarketPairs,
  NormalizationWarning,
  SourceEvidence,
} from "@/domain/assets/models";
import {
  analyzeAsset,
  type AnalysisResult,
  type BenchmarkObservation,
} from "@/domain/analysis";
import type {
  CacheResult,
  CacheState,
  CacheWarningCode,
} from "@/server/cache/service";
import {
  getRwaRepository,
  type RwaRepository,
} from "@/server/repositories/rwa-repository";
import {
  createAssetActivityRecorder,
  type AssetActivityRecorder,
} from "@/server/services/asset-activity";

export type ExplorerInput = {
  assetType?:
    | "stock"
    | "commodity"
    | "currency"
    | "government_security"
    | "etf"
    | "real_estate";
  sort?:
    | "rwa_rank"
    | "tokenized_market_cap"
    | "tokenized_volume_24h"
    | "average_tokenized_price"
    | "symbol";
  sortDir?: "asc" | "desc";
  start?: number;
  limit?: number;
};

export type IssuerDirectoryInput = {
  active?: boolean;
  start?: number;
  limit?: number;
};

export type IssuerDetailInput = {
  issuerId: string;
  start?: number;
  limit?: number;
};

export type DetailInput = {
  rwaId: number;
  positionValue: number;
  participationRate: number;
  stressHaircut: number;
};

export type CompareInput = {
  rwaIds: number[];
  positionValue: number;
  participationRate: number;
  stressHaircut: number;
};

export type SourceStatus = {
  source: "assets" | "quotes" | "marketPairs" | "metadata" | "issuers";
  evidence: SourceEvidence;
  normalizationWarnings: NormalizationWarning[];
  cache: {
    state: CacheState;
    observedAt: string;
    expiresAt: string;
    staleUntil: string;
    warning: CacheWarningCode | null;
  };
  refreshErrorCode: string | null;
};

export type ExplorerItem = ListedAsset & {
  turnoverRatio: number | null;
};

export type ExplorerResult = {
  items: ExplorerItem[];
  pagination: { totalSize: number | null; hasMore: boolean | null };
  sourceStatus: SourceStatus;
  stale: boolean;
};

export type IssuerDirectoryResult = {
  items: IssuerSummary[];
  pagination: { totalSize: number | null; hasMore: boolean | null };
  sourceStatus: SourceStatus;
  stale: boolean;
};

export type IssuerDetailResult = {
  issuer: IssuerDetail;
  sourceStatus: SourceStatus;
  stale: boolean;
};

export type AssetDetailResult = {
  asset: DetailedAsset;
  metadata: AssetMetadata | null;
  marketPairs: MarketPairs | null;
  analysis: AnalysisResult;
  sourceStatuses: SourceStatus[];
  dataGaps: Array<{
    source: "assets" | "marketPairs" | "metadata";
    code: "SOURCE_UNAVAILABLE" | "ASSET_NOT_RETURNED";
  }>;
  stale: boolean;
};

export type CompareResult = {
  items: Array<{
    asset: DetailedAsset;
    analysis: AnalysisResult;
    dataGaps: AssetDetailResult["dataGaps"];
    stale: boolean;
  }>;
  failures: Array<{
    rwaId: number;
    code: "ASSET_NOT_FOUND" | "REQUIRED_SOURCE_UNAVAILABLE";
  }>;
  scenario: Omit<CompareInput, "rwaIds">;
  stale: boolean;
};

export type EvidenceResult = {
  asset: Pick<DetailedAsset, "rwaId" | "name" | "symbol" | "assetType">;
  methodologyVersion: string;
  calculatedAt: string;
  sources: Array<
    SourceStatus & {
      parameters: Record<string, string | number>;
      features: string[];
    }
  >;
  metricLineage: Array<{
    metric: string;
    sources: SourceStatus["source"][];
    description: string;
  }>;
  excerpt: {
    currency: "USD";
    averageTokenizedPrice: number | null;
    tokenizedMarketCap: number | null;
    tokenizedVolume24h: number | null;
    tokenCount: number;
    marketPairCount: number | null;
  };
  evidenceCoverage: AnalysisResult["evidenceCoverage"];
  warnings: AnalysisResult["warnings"];
  dataGaps: AssetDetailResult["dataGaps"];
  stale: boolean;
};

export type RwaApplicationService = {
  getExplorer(input: ExplorerInput): Promise<ExplorerResult>;
  getIssuerDirectory(
    input: IssuerDirectoryInput,
  ): Promise<IssuerDirectoryResult>;
  getIssuerDetail(input: IssuerDetailInput): Promise<IssuerDetailResult>;
  getAssetDetail(input: DetailInput): Promise<AssetDetailResult>;
  compareAssets(input: CompareInput): Promise<CompareResult>;
  getAssetEvidence(input: DetailInput): Promise<EvidenceResult>;
};

export class ApplicationServiceError extends Error {
  constructor(
    readonly code: "ASSET_NOT_FOUND" | "REQUIRED_SOURCE_UNAVAILABLE",
    message: string,
    readonly cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "ApplicationServiceError";
  }
}

export function createRwaApplicationService(options: {
  repository: RwaRepository;
  activityRecorder?: AssetActivityRecorder;
  now?: () => Date;
}): RwaApplicationService {
  const now = options.now ?? (() => new Date());

  const service: RwaApplicationService = {
    async getExplorer(input) {
      const result = await options.repository.getAssets({
        assetType: input.assetType,
        sort: input.sort,
        sortDir: input.sortDir,
        start: input.start,
        limit: input.limit,
        convert: "USD",
        skipInvalid: true,
      });

      return {
        items: result.value.data.items.map((asset) => ({
          ...asset,
          turnoverRatio: turnover(asset),
        })),
        pagination: {
          totalSize: result.value.data.totalSize,
          hasMore: result.value.data.hasMore,
        },
        sourceStatus: sourceStatus("assets", result),
        stale: result.cache.state === "stale",
      };
    },

    async getIssuerDirectory(input) {
      const result = await options.repository.getIssuers({
        active: input.active,
        start: input.start,
        limit: input.limit,
      });
      return {
        items: result.value.data.items,
        pagination: {
          totalSize: result.value.data.totalSize,
          hasMore: result.value.data.hasMore,
        },
        sourceStatus: sourceStatus("issuers", result),
        stale: result.cache.state === "stale",
      };
    },

    async getIssuerDetail(input) {
      const result = await options.repository.getIssuer({
        issuerId: input.issuerId,
        start: input.start,
        limit: input.limit,
      });
      return {
        issuer: result.value.data,
        sourceStatus: sourceStatus("issuers", result),
        stale: result.cache.state === "stale",
      };
    },

    async getAssetDetail(input) {
      const id = String(input.rwaId);
      const [quotesResult, pairsResult, infoResult, assetsResult] =
        await Promise.allSettled([
          options.repository.getQuotesLatest({
            rwaId: id,
            convert: "USD",
            skipInvalid: true,
          }),
          options.repository.getMarketPairs({
            rwaId: id,
            limit: 250,
            convert: "USD",
          }),
          options.repository.getInfo({ rwaId: id, skipInvalid: true }),
          options.repository.getAssets({
            limit: 250,
            convert: "USD",
            skipInvalid: true,
          }),
        ]);

      if (quotesResult.status === "rejected") {
        throw new ApplicationServiceError(
          "REQUIRED_SOURCE_UNAVAILABLE",
          "The required asset quote source is unavailable",
          quotesResult.reason,
        );
      }

      const asset = quotesResult.value.value.data.find(
        (candidate) => candidate.rwaId === input.rwaId,
      );
      if (!asset) {
        throw new ApplicationServiceError(
          "ASSET_NOT_FOUND",
          "The requested RWA asset was not returned",
        );
      }

      if (options.activityRecorder) {
        await options.activityRecorder.recordView(asset).catch(() => undefined);
      }

      const dataGaps: AssetDetailResult["dataGaps"] = [];
      const marketPairs = settledData(
        pairsResult,
        (result) => result.value.data,
      );
      if (pairsResult.status === "rejected") {
        dataGaps.push({ source: "marketPairs", code: "SOURCE_UNAVAILABLE" });
      }

      const metadata = settledData(infoResult, (result) =>
        result.value.data.find((candidate) => candidate.rwaId === input.rwaId),
      );
      if (infoResult.status === "rejected") {
        dataGaps.push({ source: "metadata", code: "SOURCE_UNAVAILABLE" });
      } else if (!metadata) {
        dataGaps.push({ source: "metadata", code: "ASSET_NOT_RETURNED" });
      }

      const benchmarkAssets = settledData(
        assetsResult,
        (result) => result.value.data.items,
      );
      if (assetsResult.status === "rejected") {
        dataGaps.push({ source: "assets", code: "SOURCE_UNAVAILABLE" });
      }
      const benchmarks = buildBenchmarks(
        benchmarkAssets ?? [],
        asset,
        marketPairs,
      );
      const calculatedAt = now();
      if (!Number.isFinite(calculatedAt.getTime())) {
        throw new TypeError("Application clock returned an invalid Date");
      }

      const analysis = analyzeAsset({
        asset,
        marketPairs,
        benchmarks,
        positionValue: input.positionValue,
        participationRate: input.participationRate,
        stressHaircut: input.stressHaircut,
        calculatedAt,
      });

      const sourceStatuses = [
        sourceStatus("quotes", quotesResult.value),
        ...(pairsResult.status === "fulfilled"
          ? [sourceStatus("marketPairs", pairsResult.value)]
          : []),
        ...(infoResult.status === "fulfilled"
          ? [sourceStatus("metadata", infoResult.value)]
          : []),
        ...(assetsResult.status === "fulfilled"
          ? [sourceStatus("assets", assetsResult.value)]
          : []),
      ];

      return {
        asset,
        metadata,
        marketPairs,
        analysis,
        sourceStatuses,
        dataGaps,
        stale: sourceStatuses.some((status) => status.cache.state === "stale"),
      };
    },

    async compareAssets(input) {
      const settled = await Promise.allSettled(
        input.rwaIds.map((rwaId) =>
          service.getAssetDetail({
            rwaId,
            positionValue: input.positionValue,
            participationRate: input.participationRate,
            stressHaircut: input.stressHaircut,
          }),
        ),
      );
      const items: CompareResult["items"] = [];
      const failures: CompareResult["failures"] = [];
      settled.forEach((result, index) => {
        const rwaId = input.rwaIds[index]!;
        if (result.status === "fulfilled") {
          items.push({
            asset: result.value.asset,
            analysis: result.value.analysis,
            dataGaps: result.value.dataGaps,
            stale: result.value.stale,
          });
          return;
        }
        failures.push({
          rwaId,
          code:
            result.reason instanceof ApplicationServiceError
              ? result.reason.code
              : "REQUIRED_SOURCE_UNAVAILABLE",
        });
      });
      items.sort(compareByEstimatedExitDays);
      return {
        items,
        failures,
        scenario: {
          positionValue: input.positionValue,
          participationRate: input.participationRate,
          stressHaircut: input.stressHaircut,
        },
        stale: items.some((item) => item.stale),
      };
    },

    async getAssetEvidence(input) {
      const detail = await service.getAssetDetail(input);
      return {
        asset: {
          rwaId: detail.asset.rwaId,
          name: detail.asset.name,
          symbol: detail.asset.symbol,
          assetType: detail.asset.assetType,
        },
        methodologyVersion: detail.analysis.methodologyVersion,
        calculatedAt: detail.analysis.calculatedAt,
        sources: detail.sourceStatuses.map((status) => ({
          ...status,
          parameters: evidenceParameters(status.source, input.rwaId),
          features: evidenceFeatures(status.source),
        })),
        metricLineage: METRIC_LINEAGE,
        excerpt: {
          currency: "USD",
          averageTokenizedPrice: detail.asset.quote.averageTokenizedPrice,
          tokenizedMarketCap: detail.asset.quote.tokenizedMarketCap,
          tokenizedVolume24h: detail.asset.quote.tokenizedVolume24h,
          tokenCount: detail.asset.tokens.length,
          marketPairCount: detail.marketPairs?.pairs.length ?? null,
        },
        evidenceCoverage: detail.analysis.evidenceCoverage,
        warnings: detail.analysis.warnings,
        dataGaps: detail.dataGaps,
        stale: detail.stale,
      };
    },
  };
  return service;
}

function turnover(asset: ListedAsset) {
  const { tokenizedMarketCap, tokenizedVolume24h } = asset.quote;
  return tokenizedMarketCap !== null &&
    tokenizedMarketCap > 0 &&
    tokenizedVolume24h !== null &&
    tokenizedVolume24h >= 0
    ? tokenizedVolume24h / tokenizedMarketCap
    : null;
}

function sourceStatus(
  source: SourceStatus["source"],
  result: CacheResult<{
    evidence: SourceEvidence;
    warnings: NormalizationWarning[];
  }>,
): SourceStatus {
  return {
    source,
    evidence: result.value.evidence,
    normalizationWarnings: result.value.warnings,
    cache: {
      state: result.cache.state,
      observedAt: result.cache.observedAt,
      expiresAt: result.cache.expiresAt,
      staleUntil: result.cache.staleUntil,
      warning: result.cache.warning,
    },
    refreshErrorCode: result.refreshError?.code ?? null,
  };
}

function settledData<T, R>(
  result: PromiseSettledResult<T>,
  select: (value: T) => R | undefined,
): R | null {
  return result.status === "fulfilled" ? (select(result.value) ?? null) : null;
}

function buildBenchmarks(
  assets: ListedAsset[],
  target: DetailedAsset,
  marketPairs: MarketPairs | null,
): BenchmarkObservation[] {
  return assets.map((asset) => ({
    rwaId: asset.rwaId,
    assetType: asset.assetType,
    marketCap: asset.quote.tokenizedMarketCap,
    volume24h: asset.quote.tokenizedVolume24h,
    marketPairCount:
      asset.rwaId === target.rwaId ? (marketPairs?.pairs.length ?? null) : null,
  }));
}

function compareByEstimatedExitDays(
  left: CompareResult["items"][number],
  right: CompareResult["items"][number],
) {
  const leftDays =
    left.analysis.scenario.status === "available"
      ? left.analysis.scenario.estimatedExitDays
      : Number.POSITIVE_INFINITY;
  const rightDays =
    right.analysis.scenario.status === "available"
      ? right.analysis.scenario.estimatedExitDays
      : Number.POSITIVE_INFINITY;
  return (
    leftDays - rightDays || left.asset.name.localeCompare(right.asset.name)
  );
}

function evidenceParameters(
  source: SourceStatus["source"],
  rwaId: number,
): Record<string, string | number> {
  if (source === "assets") return { limit: 250, convert: "USD" };
  if (source === "metadata") return { rwaId };
  if (source === "marketPairs") return { rwaId, limit: 250, convert: "USD" };
  if (source === "issuers") return {};
  return { rwaId, convert: "USD" };
}

function evidenceFeatures(source: SourceStatus["source"]): string[] {
  if (source === "assets") return ["peer benchmarks"];
  if (source === "metadata") return ["asset context"];
  if (source === "marketPairs")
    return [
      "market concentration",
      "exchange concentration",
      "price dispersion",
    ];
  if (source === "issuers") return ["issuer profile", "linked tokens"];
  return [
    "aggregate quote",
    "exit capacity",
    "turnover",
    "token concentration",
    "issuer concentration",
  ];
}

const METRIC_LINEAGE: EvidenceResult["metricLineage"] = [
  {
    metric: "estimatedExitDays",
    sources: ["quotes"],
    description: "Aggregate 24-hour volume and the explicit scenario inputs",
  },
  {
    metric: "turnoverRatio",
    sources: ["quotes"],
    description: "Aggregate tokenized volume divided by tokenized market cap",
  },
  {
    metric: "marketConcentration",
    sources: ["marketPairs"],
    description: "Volume shares across fresh market-pair observations",
  },
  {
    metric: "issuerConcentration",
    sources: ["quotes"],
    description: "Underlying token volume grouped by mapped issuer",
  },
  {
    metric: "marketCapacityHealth",
    sources: ["quotes", "marketPairs", "assets"],
    description: "Versioned composite computed only from available components",
  },
];

let singleton: RwaApplicationService | undefined;

export function getRwaApplicationService() {
  singleton ??= createRwaApplicationService({
    repository: getRwaRepository(),
    activityRecorder: createAssetActivityRecorder(),
  });
  return singleton;
}
