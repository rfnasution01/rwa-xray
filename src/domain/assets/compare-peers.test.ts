import { describe, expect, it } from "vitest";

import {
  peerSimilarityScore,
  suggestComparablePeerIds,
  type ComparablePeerCandidate,
} from "./compare-peers";

function candidate(
  rwaId: number,
  options: Partial<ComparablePeerCandidate> = {},
): ComparablePeerCandidate {
  return {
    rwaId,
    name: `Asset ${rwaId}`,
    assetType: "stock",
    rank: rwaId,
    tokenizedMarketCap: 100_000_000,
    tokenizedVolume24h: 10_000_000,
    ...options,
  };
}

describe("Compare peer suggestions", () => {
  it("prioritizes same-category peers by market-cap and volume similarity", () => {
    const result = suggestComparablePeerIds([
      candidate(1),
      candidate(2, {
        tokenizedMarketCap: 10_000_000,
        tokenizedVolume24h: 1_000_000,
      }),
      candidate(3, {
        tokenizedMarketCap: 90_000_000,
        tokenizedVolume24h: 9_000_000,
      }),
      candidate(4, {
        assetType: "etf",
        tokenizedMarketCap: 100_000_000,
        tokenizedVolume24h: 10_000_000,
      }),
    ]);

    expect(result).toEqual([1, 3, 2, 4]);
  });

  it("uses whichever comparable metric is available", () => {
    const target = candidate(1, { tokenizedMarketCap: null });
    const close = candidate(2, {
      tokenizedMarketCap: null,
      tokenizedVolume24h: 9_000_000,
    });
    const far = candidate(3, {
      tokenizedMarketCap: null,
      tokenizedVolume24h: 100_000,
    });

    expect(peerSimilarityScore(target, close)).toBeLessThan(
      peerSimilarityScore(target, far),
    );
    expect(suggestComparablePeerIds([target, far, close], 3)).toEqual([
      1, 2, 3,
    ]);
  });

  it("falls back deterministically when comparison metrics are unavailable", () => {
    expect(
      suggestComparablePeerIds([
        candidate(1, {
          tokenizedMarketCap: null,
          tokenizedVolume24h: null,
        }),
        candidate(3, {
          rank: null,
          tokenizedMarketCap: null,
          tokenizedVolume24h: null,
        }),
        candidate(2, {
          rank: 2,
          tokenizedMarketCap: null,
          tokenizedVolume24h: null,
        }),
      ]),
    ).toEqual([1, 2, 3]);
  });
});
