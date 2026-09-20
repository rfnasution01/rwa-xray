import type { RwaAssetType } from "./models";

export type ComparablePeerCandidate = {
  rwaId: number;
  name: string;
  assetType: RwaAssetType;
  rank: number | null;
  tokenizedMarketCap: number | null;
  tokenizedVolume24h: number | null;
};

export function suggestComparablePeerIds(
  candidates: readonly ComparablePeerCandidate[],
  limit = 4,
): number[] {
  if (limit <= 0) return [];
  const target = candidates[0];
  if (!target) return [];

  const compareSimilarity = (
    left: ComparablePeerCandidate,
    right: ComparablePeerCandidate,
  ) => {
    const leftScore = peerSimilarityScore(target, left);
    const rightScore = peerSimilarityScore(target, right);
    if (leftScore !== rightScore) return leftScore - rightScore;

    const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
    const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
    return leftRank - rightRank || left.name.localeCompare(right.name);
  };

  const peers = candidates.filter(
    (candidate) => candidate.rwaId !== target.rwaId,
  );
  const sameCategory = peers
    .filter((candidate) => candidate.assetType === target.assetType)
    .sort(compareSimilarity);
  const fallback = peers
    .filter((candidate) => candidate.assetType !== target.assetType)
    .sort(compareSimilarity);

  return [target, ...sameCategory, ...fallback]
    .slice(0, limit)
    .map((candidate) => candidate.rwaId);
}

export function peerSimilarityScore(
  target: ComparablePeerCandidate,
  candidate: ComparablePeerCandidate,
): number {
  const distances = [
    logarithmicDistance(
      target.tokenizedMarketCap,
      candidate.tokenizedMarketCap,
    ),
    logarithmicDistance(
      target.tokenizedVolume24h,
      candidate.tokenizedVolume24h,
    ),
  ].filter((distance): distance is number => distance !== null);

  if (distances.length === 0) return Number.POSITIVE_INFINITY;
  return (
    distances.reduce((total, distance) => total + distance, 0) /
    distances.length
  );
}

function logarithmicDistance(
  target: number | null,
  candidate: number | null,
): number | null {
  if (
    target === null ||
    candidate === null ||
    !Number.isFinite(target) ||
    !Number.isFinite(candidate) ||
    target <= 0 ||
    candidate <= 0
  ) {
    return null;
  }
  return Math.abs(Math.log10(candidate) - Math.log10(target));
}
