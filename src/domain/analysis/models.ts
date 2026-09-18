import type { RwaAssetType } from "@/domain/assets/models";

import type { ExitCapacityResult } from "./exit-capacity";

export type AnalysisWarningCode =
  | "AGGREGATE_QUOTE_INCOMPLETE"
  | "FUTURE_TIMESTAMP"
  | "ISSUER_COVERAGE_INSUFFICIENT"
  | "MARKET_DATA_INSUFFICIENT"
  | "PAIR_STALE_EXCLUDED"
  | "PAIR_STALE_INCLUDED"
  | "PAIR_USD_QUOTE_INCOMPLETE"
  | "PAIR_VOLUME_MISMATCH"
  | "PRICE_OUTLIER_DETECTED"
  | "SOURCE_TIMESTAMP_MISSING";

export type AnalysisWarning = {
  code: AnalysisWarningCode;
  message: string;
  path?: string;
};

export type BenchmarkObservation = {
  rwaId: number;
  assetType: RwaAssetType;
  marketCap: number | null;
  volume24h: number | null;
  marketPairCount: number | null;
};

export type BenchmarkResult = {
  score: number | null;
  source: "category" | "global" | "fixed" | "unavailable";
  sampleSize: number;
};

export type ConcentrationResult = {
  status: "available" | "unavailable";
  sampleSize: number;
  totalVolume: number;
  top1Share: number | null;
  top3Share: number | null;
  hhi: number | null;
  normalizedHhi: number | null;
};

export type PriceObservation = {
  marketId: number;
  marketPair: string;
  price: number;
  volume24h: number;
  isOutlier: boolean;
};

export type PriceDispersionResult = {
  status: "available" | "unavailable";
  sampleSize: number;
  weightedMeanPrice: number | null;
  weightedAbsoluteDeviation: number | null;
  robustWeightedMeanPrice: number | null;
  robustWeightedAbsoluteDeviation: number | null;
  medianPrice: number | null;
  medianAbsoluteDeviation: number | null;
  observations: PriceObservation[];
};

export type EvidenceFactor = {
  key:
    | "aggregateQuote"
    | "freshTimestamp"
    | "marketPairs"
    | "tokenBreakdown"
    | "issuerMapping"
    | "crossFieldConsistency";
  weight: number;
  earned: number;
  passed: boolean;
};

export type EvidenceCoverage = {
  score: number;
  label: "Limited" | "Moderate" | "High";
  factors: EvidenceFactor[];
};

export type HealthComponent = {
  key:
    | "activity"
    | "diversification"
    | "priceConsistency"
    | "availability"
    | "freshness";
  score: number | null;
  weight: number;
  available: boolean;
};

export type MarketCapacityHealth = {
  score: number | null;
  availableWeight: number;
  coverage: number;
  status: "available" | "insufficient_evidence";
  components: HealthComponent[];
};

export type AnalysisResult = {
  asset: {
    rwaId: number;
    name: string;
    symbol: string;
    assetType: RwaAssetType;
  };
  calculatedAt: string;
  methodologyVersion: string;
  configurationHash: string;
  inputSnapshotIds: string[];
  scenario: ExitCapacityResult;
  metrics: {
    turnoverRatio: number | null;
    positionToVolumeRatio: number | null;
    freshnessAgeMinutes: number | null;
    freshnessScore: number | null;
    activityBenchmark: BenchmarkResult;
    availabilityBenchmark: BenchmarkResult;
  };
  concentration: {
    market: ConcentrationResult;
    exchange: ConcentrationResult;
    token: ConcentrationResult;
    issuer: ConcentrationResult;
    issuerMappedVolumeCoverage: number | null;
  };
  priceDispersion: PriceDispersionResult;
  evidenceCoverage: EvidenceCoverage;
  marketCapacityHealth: MarketCapacityHealth;
  warnings: AnalysisWarning[];
};
