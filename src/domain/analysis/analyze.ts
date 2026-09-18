import type {
  DetailedAsset,
  MarketPair,
  MarketPairs,
} from "@/domain/assets/models";

import {
  calculateConcentration,
  unavailableConcentration,
} from "./concentration";
import {
  ANALYSIS_CONFIG,
  CONFIGURATION_HASH,
  METHODOLOGY_VERSION,
} from "./config";
import { calculateExitCapacity } from "./exit-capacity";
import type {
  AnalysisResult,
  AnalysisWarning,
  BenchmarkObservation,
  BenchmarkResult,
  ConcentrationResult,
  EvidenceCoverage,
  EvidenceFactor,
  HealthComponent,
  MarketCapacityHealth,
} from "./models";
import { calculatePriceDispersion } from "./price-dispersion";
import {
  clamp,
  interpolateThresholdScore,
  percentileRank,
  sum,
} from "./statistics";

export type AnalyzeAssetInput = {
  asset: DetailedAsset;
  marketPairs: MarketPairs | null;
  benchmarks?: BenchmarkObservation[];
  positionValue?: number;
  participationRate?: number;
  stressHaircut?: number;
  calculatedAt?: Date;
  inputSnapshotIds?: string[];
};

export function analyzeAsset(input: AnalyzeAssetInput): AnalysisResult {
  const calculatedAt = input.calculatedAt ?? new Date();
  if (!Number.isFinite(calculatedAt.getTime())) {
    throw new TypeError("calculatedAt must be a valid Date");
  }

  const warnings: AnalysisWarning[] = [];
  const quote = input.asset.quote;
  const turnoverRatio =
    quote.tokenizedMarketCap !== null &&
    quote.tokenizedMarketCap > 0 &&
    quote.tokenizedVolume24h !== null &&
    quote.tokenizedVolume24h >= 0
      ? quote.tokenizedVolume24h / quote.tokenizedMarketCap
      : null;

  if (
    quote.averageTokenizedPrice === null ||
    quote.tokenizedMarketCap === null ||
    quote.tokenizedVolume24h === null
  ) {
    warnings.push({
      code: "AGGREGATE_QUOTE_INCOMPLETE",
      message: "The aggregate quote is incomplete",
    });
  }

  const freshness = calculateFreshness(
    quote.sourceUpdatedAt,
    calculatedAt,
    warnings,
  );
  const pairSelection = selectUsablePairs(
    input.marketPairs?.pairs ?? [],
    calculatedAt,
    warnings,
  );
  const marketConcentration = calculateConcentration(
    pairSelection.pairs.map((pair) => ({
      key: String(pair.marketId),
      volume: pair.marketQuote.volume24h,
    })),
  );
  const exchangeConcentration = calculateConcentration(
    pairSelection.pairs.map((pair) => ({
      key: String(pair.exchange.id),
      volume: pair.marketQuote.volume24h,
    })),
  );
  const tokenConcentration = calculateConcentration(
    input.asset.tokens.map((token) => ({
      key: String(token.cryptoId),
      volume: token.volume24h,
    })),
  );
  const issuerAnalysis = calculateIssuerConcentration(input.asset, warnings);

  if (marketConcentration.status === "unavailable") {
    warnings.push({
      code: "MARKET_DATA_INSUFFICIENT",
      message:
        "No usable market-pair volume is available for concentration analysis",
    });
  }

  const priceDispersion = calculatePriceDispersion(pairSelection.pairs);
  if (
    priceDispersion.observations.some((observation) => observation.isOutlier)
  ) {
    warnings.push({
      code: "PRICE_OUTLIER_DETECTED",
      message:
        "One or more market prices were flagged as robust statistical outliers",
    });
  }

  const benchmarkInput = input.benchmarks ?? [];
  const activityBenchmark = benchmarkTurnover(
    turnoverRatio,
    input.asset.assetType,
    benchmarkInput,
  );
  const availabilityBenchmark = benchmarkAvailability(
    input.marketPairs ? pairSelection.pairs.length : null,
    input.asset.assetType,
    benchmarkInput,
  );

  const scenario = calculateExitCapacity({
    positionValue: input.positionValue ?? 100_000,
    volume24h: quote.tokenizedVolume24h,
    participationRate: input.participationRate ?? 0.05,
    stressHaircut: input.stressHaircut ?? 0,
  });

  const diversificationScore = calculateDiversificationScore([
    marketConcentration,
    exchangeConcentration,
    tokenConcentration,
    issuerAnalysis.concentration,
  ]);
  const priceConsistencyScore =
    priceDispersion.sampleSize >= 2 &&
    priceDispersion.robustWeightedAbsoluteDeviation !== null
      ? 100 *
        clamp(
          1 -
            priceDispersion.robustWeightedAbsoluteDeviation /
              ANALYSIS_CONFIG.priceDispersionCap,
          0,
          1,
        )
      : null;

  const structuralConsistency = checkStructuralConsistency(
    input.asset,
    pairSelection.pairs,
  );
  addVolumeMismatchWarning(
    quote.tokenizedVolume24h,
    marketConcentration.totalVolume,
    warnings,
  );

  const evidenceCoverage = calculateEvidenceCoverage({
    aggregateComplete:
      quote.averageTokenizedPrice !== null &&
      quote.tokenizedMarketCap !== null &&
      quote.tokenizedVolume24h !== null,
    freshTimestamp: freshness.ageMinutes !== null && freshness.ageMinutes <= 60,
    usablePairCount: pairSelection.pairs.filter(
      (pair) =>
        pair.marketQuote.volume24h !== null && pair.marketQuote.volume24h > 0,
    ).length,
    hasIncludedStalePairs: pairSelection.hasIncludedStalePairs,
    tokenCount: input.asset.tokens.length,
    issuerCoverage: issuerAnalysis.mappedCoverage,
    structuralConsistency,
  });

  const components: HealthComponent[] = [
    component("activity", activityBenchmark.score),
    component("diversification", diversificationScore),
    component("priceConsistency", priceConsistencyScore),
    component("availability", availabilityBenchmark.score),
    component("freshness", freshness.score),
  ];
  const marketCapacityHealth = calculateHealth(components);

  return {
    asset: {
      rwaId: input.asset.rwaId,
      name: input.asset.name,
      symbol: input.asset.symbol,
      assetType: input.asset.assetType,
    },
    calculatedAt: calculatedAt.toISOString(),
    methodologyVersion: METHODOLOGY_VERSION,
    configurationHash: CONFIGURATION_HASH,
    inputSnapshotIds: [...(input.inputSnapshotIds ?? [])],
    scenario,
    metrics: {
      turnoverRatio,
      positionToVolumeRatio:
        quote.tokenizedVolume24h !== null && quote.tokenizedVolume24h > 0
          ? (input.positionValue ?? 100_000) / quote.tokenizedVolume24h
          : null,
      freshnessAgeMinutes: freshness.ageMinutes,
      freshnessScore: freshness.score,
      activityBenchmark,
      availabilityBenchmark,
    },
    concentration: {
      market: marketConcentration,
      exchange: exchangeConcentration,
      token: tokenConcentration,
      issuer: issuerAnalysis.concentration,
      issuerMappedVolumeCoverage: issuerAnalysis.mappedCoverage,
    },
    priceDispersion,
    evidenceCoverage,
    marketCapacityHealth,
    warnings: deduplicateWarnings(warnings),
  };
}

function calculateFreshness(
  sourceUpdatedAt: string | null,
  calculatedAt: Date,
  warnings: AnalysisWarning[],
) {
  if (!sourceUpdatedAt) {
    warnings.push({
      code: "SOURCE_TIMESTAMP_MISSING",
      message: "The aggregate quote does not include a source timestamp",
    });
    return { ageMinutes: null, score: null };
  }

  const sourceTime = new Date(sourceUpdatedAt);
  const ageMinutes = (calculatedAt.getTime() - sourceTime.getTime()) / 60_000;
  if (ageMinutes < -ANALYSIS_CONFIG.futureTimestampToleranceMinutes) {
    warnings.push({
      code: "FUTURE_TIMESTAMP",
      message: "The aggregate quote timestamp is unexpectedly in the future",
    });
    return { ageMinutes, score: 0 };
  }

  const age = Math.max(0, ageMinutes);
  if (age <= 2) return { ageMinutes: age, score: 100 };
  if (age <= 5) return { ageMinutes: age, score: 80 };
  if (age <= 15) return { ageMinutes: age, score: 50 };
  if (age <= 60) return { ageMinutes: age, score: 20 };
  return { ageMinutes: age, score: 0 };
}

function selectUsablePairs(
  pairs: readonly MarketPair[],
  calculatedAt: Date,
  warnings: AnalysisWarning[],
) {
  const selected: MarketPair[] = [];
  let hasIncludedStalePairs = false;
  let includedStaleCount = 0;
  let excludedStaleCount = 0;
  let incompleteCount = 0;

  for (const pair of pairs) {
    const timestamp = pair.marketQuote.sourceUpdatedAt;
    if (
      timestamp === null ||
      pair.marketQuote.price === null ||
      pair.marketQuote.volume24h === null ||
      pair.marketQuote.price <= 0 ||
      pair.marketQuote.volume24h < 0
    ) {
      incompleteCount += 1;
      continue;
    }

    const ageMinutes =
      (calculatedAt.getTime() - new Date(timestamp).getTime()) / 60_000;
    if (ageMinutes < -ANALYSIS_CONFIG.futureTimestampToleranceMinutes) {
      excludedStaleCount += 1;
      continue;
    }
    if (ageMinutes > ANALYSIS_CONFIG.pairFreshness.warningMaxMinutes) {
      excludedStaleCount += 1;
      continue;
    }
    if (ageMinutes > ANALYSIS_CONFIG.pairFreshness.validMaxMinutes) {
      includedStaleCount += 1;
      hasIncludedStalePairs = true;
    }
    selected.push(pair);
  }

  if (incompleteCount > 0) {
    warnings.push({
      code: "PAIR_USD_QUOTE_INCOMPLETE",
      message: `${incompleteCount} market pair(s) were excluded because USD quote data was incomplete`,
    });
  }
  if (includedStaleCount > 0) {
    warnings.push({
      code: "PAIR_STALE_INCLUDED",
      message: `${includedStaleCount} market pair(s) aged 15–60 minutes were included with reduced evidence credit`,
    });
  }
  if (excludedStaleCount > 0) {
    warnings.push({
      code: "PAIR_STALE_EXCLUDED",
      message: `${excludedStaleCount} stale or future-dated market pair(s) were excluded`,
    });
  }

  return { pairs: selected, hasIncludedStalePairs };
}

function calculateIssuerConcentration(
  asset: DetailedAsset,
  warnings: AnalysisWarning[],
) {
  const positiveVolumeTokens = asset.tokens.filter(
    (token) =>
      token.volume24h !== null &&
      Number.isFinite(token.volume24h) &&
      token.volume24h > 0,
  );
  const totalVolume = sum(
    positiveVolumeTokens.map((token) => token.volume24h!),
  );
  if (totalVolume <= 0) {
    return { concentration: unavailableConcentration(), mappedCoverage: null };
  }

  const mapped = positiveVolumeTokens.filter(
    (token) => token.issuerId !== null,
  );
  const mappedVolume = sum(mapped.map((token) => token.volume24h!));
  const mappedCoverage = mappedVolume / totalVolume;
  if (mappedCoverage < ANALYSIS_CONFIG.issuerCoverageMinimum) {
    warnings.push({
      code: "ISSUER_COVERAGE_INSUFFICIENT",
      message:
        "Issuer concentration is unavailable because mapped token volume is below 80%",
    });
    return { concentration: unavailableConcentration(), mappedCoverage };
  }

  return {
    concentration: calculateConcentration(
      mapped.map((token) => ({
        key: token.issuerId!,
        volume: token.volume24h,
      })),
    ),
    mappedCoverage,
  };
}

function benchmarkTurnover(
  value: number | null,
  assetType: DetailedAsset["assetType"],
  observations: readonly BenchmarkObservation[],
): BenchmarkResult {
  if (value === null) return unavailableBenchmark();
  const metric = (item: BenchmarkObservation) =>
    item.marketCap !== null &&
    item.marketCap > 0 &&
    item.volume24h !== null &&
    item.volume24h >= 0
      ? item.volume24h / item.marketCap
      : null;
  const category = observations
    .filter((item) => item.assetType === assetType)
    .map(metric)
    .filter(isNumber);
  if (category.length >= ANALYSIS_CONFIG.categoryBenchmarkMinimum) {
    return {
      score: percentileRank(value, category),
      source: "category",
      sampleSize: category.length,
    };
  }
  const global = observations.map(metric).filter(isNumber);
  if (global.length > 0) {
    return {
      score: percentileRank(value, global),
      source: "global",
      sampleSize: global.length,
    };
  }
  return {
    score: interpolateThresholdScore(
      value,
      ANALYSIS_CONFIG.fixedTurnoverThresholds,
    ),
    source: "fixed",
    sampleSize: 0,
  };
}

function benchmarkAvailability(
  value: number | null,
  assetType: DetailedAsset["assetType"],
  observations: readonly BenchmarkObservation[],
): BenchmarkResult {
  if (value === null) return unavailableBenchmark();
  const category = observations
    .filter((item) => item.assetType === assetType)
    .map((item) => item.marketPairCount)
    .filter(isNumber);
  if (category.length >= ANALYSIS_CONFIG.categoryBenchmarkMinimum) {
    return {
      score: percentileRank(value, category),
      source: "category",
      sampleSize: category.length,
    };
  }
  const global = observations
    .map((item) => item.marketPairCount)
    .filter(isNumber);
  if (global.length > 0) {
    return {
      score: percentileRank(value, global),
      source: "global",
      sampleSize: global.length,
    };
  }
  return {
    score:
      100 *
      clamp(
        Math.log1p(value) /
          Math.log1p(ANALYSIS_CONFIG.availabilityReferencePairCount),
        0,
        1,
      ),
    source: "fixed",
    sampleSize: 0,
  };
}

function calculateDiversificationScore(
  concentrations: readonly ConcentrationResult[],
) {
  const available = concentrations
    .map((item) => item.normalizedHhi)
    .filter(isNumber)
    .map((hhi) => 100 * (1 - clamp(hhi, 0, 1)));
  return available.length > 0 ? sum(available) / available.length : null;
}

function calculateEvidenceCoverage(input: {
  aggregateComplete: boolean;
  freshTimestamp: boolean;
  usablePairCount: number;
  hasIncludedStalePairs: boolean;
  tokenCount: number;
  issuerCoverage: number | null;
  structuralConsistency: boolean;
}): EvidenceCoverage {
  const weights = ANALYSIS_CONFIG.evidenceWeights;
  const pairEarned =
    input.usablePairCount >= 2
      ? input.hasIncludedStalePairs
        ? weights.marketPairs / 2
        : weights.marketPairs
      : 0;
  const factors: EvidenceFactor[] = [
    factor("aggregateQuote", weights.aggregateQuote, input.aggregateComplete),
    factor("freshTimestamp", weights.freshTimestamp, input.freshTimestamp),
    {
      key: "marketPairs",
      weight: weights.marketPairs,
      earned: pairEarned,
      passed: pairEarned === weights.marketPairs,
    },
    factor("tokenBreakdown", weights.tokenBreakdown, input.tokenCount > 0),
    factor(
      "issuerMapping",
      weights.issuerMapping,
      input.issuerCoverage !== null &&
        input.issuerCoverage >= ANALYSIS_CONFIG.issuerCoverageMinimum,
    ),
    factor(
      "crossFieldConsistency",
      weights.crossFieldConsistency,
      input.structuralConsistency,
    ),
  ];
  const score = sum(factors.map((item) => item.earned));
  return {
    score,
    label: score >= 80 ? "High" : score >= 60 ? "Moderate" : "Limited",
    factors,
  };
}

function checkStructuralConsistency(
  asset: DetailedAsset,
  pairs: readonly MarketPair[],
) {
  const monetaryValues = [
    asset.quote.averageTokenizedPrice,
    asset.quote.tokenizedMarketCap,
    asset.quote.tokenizedVolume24h,
    ...asset.tokens.flatMap((token) => [
      token.price,
      token.marketCap,
      token.volume24h,
    ]),
    ...pairs.flatMap((pair) => [
      pair.marketQuote.price,
      pair.marketQuote.volume24h,
    ]),
  ].filter(isNumber);
  const marketIds = pairs.map((pair) => pair.marketId);
  return (
    monetaryValues.every((value) => value >= 0) &&
    new Set(marketIds).size === marketIds.length &&
    asset.quote.currency === "USD" &&
    asset.tokens.every((token) => token.currency === "USD") &&
    pairs.every((pair) => pair.marketQuote.currency === "USD")
  );
}

function addVolumeMismatchWarning(
  aggregateVolume: number | null,
  pairVolume: number,
  warnings: AnalysisWarning[],
) {
  if (aggregateVolume === null || aggregateVolume <= 0 || pairVolume <= 0)
    return;
  const relativeDifference =
    Math.abs(pairVolume - aggregateVolume) / aggregateVolume;
  if (relativeDifference > 0.5) {
    warnings.push({
      code: "PAIR_VOLUME_MISMATCH",
      message:
        "Aggregate volume and included market-pair volume differ by more than 50%; their coverage may differ",
    });
  }
}

function component(
  key: HealthComponent["key"],
  score: number | null,
): HealthComponent {
  return {
    key,
    score,
    weight: ANALYSIS_CONFIG.healthWeights[key],
    available: score !== null,
  };
}

function calculateHealth(components: HealthComponent[]): MarketCapacityHealth {
  const available = components.filter(
    (item): item is HealthComponent & { score: number } => item.score !== null,
  );
  const availableWeight = sum(available.map((item) => item.weight));
  const coverage = availableWeight / 100;
  if (coverage < ANALYSIS_CONFIG.compositeCoverageMinimum) {
    return {
      score: null,
      availableWeight,
      coverage,
      status: "insufficient_evidence",
      components,
    };
  }

  const score =
    sum(available.map((item) => item.score * item.weight)) / availableWeight;
  return {
    score,
    availableWeight,
    coverage,
    status: "available",
    components,
  };
}

function factor(
  key: EvidenceFactor["key"],
  weight: number,
  passed: boolean,
): EvidenceFactor {
  return { key, weight, earned: passed ? weight : 0, passed };
}

function unavailableBenchmark(): BenchmarkResult {
  return { score: null, source: "unavailable", sampleSize: 0 };
}

function isNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function deduplicateWarnings(warnings: AnalysisWarning[]) {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.path ?? ""}:${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
