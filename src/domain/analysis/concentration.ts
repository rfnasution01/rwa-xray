import type { ConcentrationResult } from "./models";
import { sum } from "./statistics";

export type VolumeObservation = {
  key: string;
  volume: number | null;
};

export function calculateConcentration(
  observations: readonly VolumeObservation[],
): ConcentrationResult {
  const grouped = new Map<string, number>();
  for (const observation of observations) {
    if (
      observation.volume === null ||
      !Number.isFinite(observation.volume) ||
      observation.volume <= 0
    ) {
      continue;
    }
    grouped.set(
      observation.key,
      (grouped.get(observation.key) ?? 0) + observation.volume,
    );
  }

  const volumes = [...grouped.values()];
  const totalVolume = sum(volumes);
  if (volumes.length === 0 || totalVolume <= 0) {
    return unavailableConcentration();
  }

  const shares = volumes
    .map((volume) => volume / totalVolume)
    .sort((left, right) => right - left);
  const hhi = sum(shares.map((share) => share ** 2));
  const normalizedHhi =
    shares.length === 1
      ? 1
      : (hhi - 1 / shares.length) / (1 - 1 / shares.length);

  return {
    status: "available",
    sampleSize: shares.length,
    totalVolume,
    top1Share: shares[0] ?? null,
    top3Share: sum(shares.slice(0, 3)),
    hhi,
    normalizedHhi,
  };
}

export function unavailableConcentration(): ConcentrationResult {
  return {
    status: "unavailable",
    sampleSize: 0,
    totalVolume: 0,
    top1Share: null,
    top3Share: null,
    hhi: null,
    normalizedHhi: null,
  };
}
