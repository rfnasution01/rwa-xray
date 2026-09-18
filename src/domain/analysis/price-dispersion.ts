import type { MarketPair } from "@/domain/assets/models";

import { ANALYSIS_CONFIG } from "./config";
import type { PriceDispersionResult, PriceObservation } from "./models";
import { median, sum } from "./statistics";

export function calculatePriceDispersion(
  pairs: readonly MarketPair[],
): PriceDispersionResult {
  const valid = pairs.flatMap((pair) => {
    const { price, volume24h } = pair.marketQuote;
    if (
      price === null ||
      volume24h === null ||
      !Number.isFinite(price) ||
      !Number.isFinite(volume24h) ||
      price <= 0 ||
      volume24h <= 0
    ) {
      return [];
    }
    return [
      {
        marketId: pair.marketId,
        marketPair: pair.marketPair,
        price,
        volume24h,
      },
    ];
  });

  if (valid.length === 0) return unavailablePriceDispersion();

  const medianPrice = median(valid.map((item) => item.price));
  const medianAbsoluteDeviation =
    medianPrice === null
      ? null
      : median(valid.map((item) => Math.abs(item.price - medianPrice)));

  const observations: PriceObservation[] = valid.map((item) => ({
    ...item,
    isOutlier: isOutlier(item.price, medianPrice, medianAbsoluteDeviation),
  }));
  const robust = observations.filter((item) => !item.isOutlier);
  const rawMetrics = weightedMetrics(observations);
  const robustMetrics = weightedMetrics(robust);

  return {
    status: "available",
    sampleSize: observations.length,
    weightedMeanPrice: rawMetrics.mean,
    weightedAbsoluteDeviation: rawMetrics.dispersion,
    robustWeightedMeanPrice: robustMetrics.mean,
    robustWeightedAbsoluteDeviation: robustMetrics.dispersion,
    medianPrice,
    medianAbsoluteDeviation,
    observations,
  };
}

function weightedMetrics(
  observations: readonly Omit<PriceObservation, "isOutlier">[],
) {
  const totalVolume = sum(observations.map((item) => item.volume24h));
  if (observations.length === 0 || totalVolume <= 0) {
    return { mean: null, dispersion: null };
  }

  const mean =
    sum(
      observations.map((item) => item.price * (item.volume24h / totalVolume)),
    ) || null;
  if (mean === null || mean <= 0) return { mean: null, dispersion: null };
  const dispersion = sum(
    observations.map(
      (item) =>
        (item.volume24h / totalVolume) * (Math.abs(item.price - mean) / mean),
    ),
  );
  return { mean, dispersion };
}

function isOutlier(price: number, center: number | null, mad: number | null) {
  if (center === null || mad === null) return false;
  if (mad === 0) return price !== center;
  const modifiedZ = (0.6745 * Math.abs(price - center)) / mad;
  return modifiedZ > ANALYSIS_CONFIG.outlierModifiedZThreshold;
}

function unavailablePriceDispersion(): PriceDispersionResult {
  return {
    status: "unavailable",
    sampleSize: 0,
    weightedMeanPrice: null,
    weightedAbsoluteDeviation: null,
    robustWeightedMeanPrice: null,
    robustWeightedAbsoluteDeviation: null,
    medianPrice: null,
    medianAbsoluteDeviation: null,
    observations: [],
  };
}
