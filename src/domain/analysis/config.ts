export const METHODOLOGY_VERSION = "1.1.0";

export const ANALYSIS_CONFIG = {
  categoryBenchmarkMinimum: 10,
  issuerCoverageMinimum: 0.8,
  compositeCoverageMinimum: 0.6,
  priceDispersionCap: 0.05,
  outlierModifiedZThreshold: 3.5,
  pairFreshness: {
    validMaxMinutes: 15,
    warningMaxMinutes: 60,
  },
  futureTimestampToleranceMinutes: 5,
  exitPlanningHorizonDays: {
    underOneDayMaxExclusive: 1,
    oneToThreeDaysMaxInclusive: 3,
    threeToSevenDaysMaxInclusive: 7,
  },
  healthWeights: {
    activity: 30,
    diversification: 30,
    priceConsistency: 15,
    availability: 15,
    freshness: 10,
  },
  evidenceWeights: {
    aggregateQuote: 25,
    freshTimestamp: 20,
    marketPairs: 20,
    tokenBreakdown: 15,
    issuerMapping: 10,
    crossFieldConsistency: 10,
  },
  fixedTurnoverThresholds: [
    { value: 0, score: 0 },
    { value: 0.001, score: 20 },
    { value: 0.005, score: 40 },
    { value: 0.01, score: 60 },
    { value: 0.05, score: 80 },
    { value: 0.1, score: 100 },
  ],
  availabilityReferencePairCount: 20,
} as const;

export const CONFIGURATION_HASH = hashString(JSON.stringify(ANALYSIS_CONFIG));

function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
