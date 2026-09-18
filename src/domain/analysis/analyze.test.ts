import { describe, expect, it } from "vitest";

import type {
  DetailedAsset,
  MarketPair,
  MarketPairs,
} from "@/domain/assets/models";

import { analyzeAsset } from "./analyze";
import { calculateConcentration } from "./concentration";
import { METHODOLOGY_VERSION } from "./config";
import type { BenchmarkObservation } from "./models";
import { calculatePriceDispersion } from "./price-dispersion";

const calculatedAt = new Date("2026-09-09T07:00:00.000Z");

function asset(overrides: Partial<DetailedAsset> = {}): DetailedAsset {
  return {
    rwaId: 101,
    name: "Example Treasury Bill",
    symbol: "EXTB",
    slug: "example-treasury-bill",
    assetType: "government_security",
    rank: 1,
    hasTokens: true,
    quote: {
      currency: "USD",
      averageTokenizedPrice: 100,
      tokenizedMarketCap: 10_000_000,
      tokenizedVolume24h: 500_000,
      sourceUpdatedAt: "2026-09-09T06:59:00.000Z",
    },
    tokens: [
      {
        cryptoId: 1,
        name: "Token A",
        symbol: "EXTA",
        issuerId: "issuer-a",
        issuerName: "Issuer A",
        currency: "USD",
        price: 100,
        marketCap: 8_000_000,
        volume24h: 400_000,
      },
      {
        cryptoId: 2,
        name: "Token B",
        symbol: "EXTB",
        issuerId: "issuer-b",
        issuerName: "Issuer B",
        currency: "USD",
        price: 101,
        marketCap: 2_000_000,
        volume24h: 100_000,
      },
    ],
    tradfiMarkets: [],
    ...overrides,
  };
}

function pair(
  marketId: number,
  price: number | null,
  volume24h: number | null,
  sourceUpdatedAt = "2026-09-09T06:59:00.000Z",
  exchangeId = marketId,
): MarketPair {
  return {
    marketId,
    marketPair: `EXT${marketId}/USD`,
    category: "spot",
    feeType: "percentage",
    exchange: {
      id: exchangeId,
      name: `Exchange ${exchangeId}`,
      slug: `exchange-${exchangeId}`,
    },
    base: {
      cryptoId: marketId,
      symbol: `EXT${marketId}`,
      exchangeSymbol: `EXT${marketId}`,
      currencyType: "cryptocurrency",
    },
    quote: {
      cryptoId: 2781,
      symbol: "USD",
      exchangeSymbol: "USD",
      currencyType: "fiat",
    },
    marketQuote: { currency: "USD", price, volume24h, sourceUpdatedAt },
  };
}

function markets(pairs: MarketPair[]): MarketPairs {
  return {
    rwaId: 101,
    name: "Example Treasury Bill",
    symbol: "EXTB",
    reportedPairCount: pairs.length,
    pairs,
    totalSize: pairs.length,
    hasMore: false,
  };
}

const healthyPairs = markets([
  pair(1, 100, 390_000, undefined, 10),
  pair(2, 101, 100_000, undefined, 20),
  pair(3, 150, 10_000, undefined, 30),
]);

describe("analyzeAsset", () => {
  it("produces a complete, versioned market-capacity analysis", () => {
    const result = analyzeAsset({
      asset: asset(),
      marketPairs: healthyPairs,
      calculatedAt,
      inputSnapshotIds: ["quote-1", "pairs-1"],
    });

    expect(result.methodologyVersion).toBe(METHODOLOGY_VERSION);
    expect(result.configurationHash).toMatch(/^[0-9a-f]{8}$/);
    expect(result.metrics.turnoverRatio).toBe(0.05);
    expect(result.scenario).toMatchObject({
      status: "available",
      dailyCapacity: 25_000,
      estimatedExitDays: 4,
    });
    expect(result.concentration.market).toMatchObject({
      status: "available",
      sampleSize: 3,
      top1Share: 0.78,
    });
    expect(result.concentration.issuerMappedVolumeCoverage).toBe(1);
    expect(result.evidenceCoverage.label).toBe("High");
    expect(result.marketCapacityHealth.status).toBe("available");
    expect(result.marketCapacityHealth.coverage).toBe(1);
    expect(result.inputSnapshotIds).toEqual(["quote-1", "pairs-1"]);
  });

  it("uses a category benchmark when at least ten valid peers exist", () => {
    const benchmarks: BenchmarkObservation[] = Array.from(
      { length: 10 },
      (_, index) => ({
        rwaId: index + 1,
        assetType: "government_security",
        marketCap: 10_000_000,
        volume24h: (index + 1) * 100_000,
        marketPairCount: index + 1,
      }),
    );

    const result = analyzeAsset({
      asset: asset(),
      marketPairs: healthyPairs,
      benchmarks,
      calculatedAt,
    });
    expect(result.metrics.activityBenchmark).toMatchObject({
      source: "category",
      sampleSize: 10,
    });
    expect(result.metrics.availabilityBenchmark).toMatchObject({
      source: "category",
      sampleSize: 10,
    });
  });

  it("falls back to a global benchmark when the category sample is too small", () => {
    const benchmarks: BenchmarkObservation[] = [
      {
        rwaId: 1,
        assetType: "commodity",
        marketCap: 10_000_000,
        volume24h: 100_000,
        marketPairCount: 2,
      },
      {
        rwaId: 2,
        assetType: "stock",
        marketCap: 10_000_000,
        volume24h: 900_000,
        marketPairCount: 8,
      },
    ];

    const result = analyzeAsset({
      asset: asset(),
      marketPairs: healthyPairs,
      benchmarks,
      calculatedAt,
    });
    expect(result.metrics.activityBenchmark.source).toBe("global");
    expect(result.metrics.availabilityBenchmark.source).toBe("global");
  });

  it("withholds issuer concentration below 80% mapped volume", () => {
    const lowCoverageAsset = asset({
      tokens: [
        { ...asset().tokens[0]!, issuerId: null, volume24h: 300_000 },
        { ...asset().tokens[1]!, issuerId: "issuer-b", volume24h: 100_000 },
      ],
    });

    const result = analyzeAsset({
      asset: lowCoverageAsset,
      marketPairs: healthyPairs,
      calculatedAt,
    });
    expect(result.concentration.issuerMappedVolumeCoverage).toBe(0.25);
    expect(result.concentration.issuer.status).toBe("unavailable");
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "ISSUER_COVERAGE_INSUFFICIENT" }),
    );
  });

  it("includes 15–60 minute pairs with reduced evidence and excludes older pairs", () => {
    const stalePairs = markets([
      pair(1, 100, 200_000, "2026-09-09T06:59:00.000Z"),
      pair(2, 101, 200_000, "2026-09-09T06:30:00.000Z"),
      pair(3, 102, 100_000, "2026-09-09T05:59:00.000Z"),
    ]);

    const result = analyzeAsset({
      asset: asset(),
      marketPairs: stalePairs,
      calculatedAt,
    });
    expect(result.concentration.market.sampleSize).toBe(2);
    expect(
      result.evidenceCoverage.factors.find(
        (factor) => factor.key === "marketPairs",
      ),
    ).toMatchObject({
      earned: 10,
      passed: false,
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PAIR_STALE_INCLUDED" }),
        expect.objectContaining({ code: "PAIR_STALE_EXCLUDED" }),
      ]),
    );
  });

  it("does not produce a composite score when available weight is below 60%", () => {
    const incomplete = asset({
      quote: {
        currency: "USD",
        averageTokenizedPrice: null,
        tokenizedMarketCap: null,
        tokenizedVolume24h: null,
        sourceUpdatedAt: null,
      },
      tokens: [],
    });

    const result = analyzeAsset({
      asset: incomplete,
      marketPairs: null,
      calculatedAt,
    });
    expect(result.marketCapacityHealth).toMatchObject({
      score: null,
      status: "insufficient_evidence",
    });
    expect(result.evidenceCoverage.label).toBe("Limited");
  });

  it("preserves zero turnover while reporting no observed exit capacity", () => {
    const zeroVolume = asset({
      quote: { ...asset().quote, tokenizedVolume24h: 0 },
    });
    const result = analyzeAsset({
      asset: zeroVolume,
      marketPairs: markets([]),
      calculatedAt,
    });

    expect(result.metrics.turnoverRatio).toBe(0);
    expect(result.scenario).toEqual({
      status: "unavailable",
      reason: "NO_OBSERVED_CAPACITY",
    });
  });
});

describe("analysis primitives", () => {
  it("calculates normalized HHI for equal and fully concentrated distributions", () => {
    expect(
      calculateConcentration([
        { key: "a", volume: 25 },
        { key: "b", volume: 25 },
        { key: "c", volume: 25 },
        { key: "d", volume: 25 },
      ]),
    ).toMatchObject({ hhi: 0.25, normalizedHhi: 0 });
    expect(calculateConcentration([{ key: "a", volume: 100 }])).toMatchObject({
      hhi: 1,
      normalizedHhi: 1,
    });
  });

  it("keeps raw price observations and marks robust outliers", () => {
    const result = calculatePriceDispersion(healthyPairs.pairs);
    expect(result.sampleSize).toBe(3);
    expect(
      result.observations.find((item) => item.marketId === 3)?.isOutlier,
    ).toBe(true);
    expect(result.weightedAbsoluteDeviation).not.toBe(
      result.robustWeightedAbsoluteDeviation,
    );
    expect(result.observations).toHaveLength(3);
  });
});
