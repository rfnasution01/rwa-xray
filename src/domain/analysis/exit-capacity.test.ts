import { describe, expect, it } from "vitest";

import {
  calculateExitCapacity,
  classifyExitPlanningHorizon,
} from "./exit-capacity";

describe("calculateExitCapacity", () => {
  it("calculates the approved default scenario", () => {
    expect(
      calculateExitCapacity({
        positionValue: 100_000,
        volume24h: 2_000_000,
        participationRate: 0.05,
        stressHaircut: 0,
      }),
    ).toEqual({
      status: "available",
      effectiveVolume: 2_000_000,
      dailyCapacity: 100_000,
      estimatedExitDays: 1,
      planningHorizon: "one_to_three_days",
      positionToVolumeRatio: 0.05,
    });
  });

  it("applies a volume stress haircut", () => {
    const result = calculateExitCapacity({
      positionValue: 100_000,
      volume24h: 2_000_000,
      participationRate: 0.05,
      stressHaircut: 0.5,
    });

    expect(result).toMatchObject({
      status: "available",
      effectiveVolume: 1_000_000,
      dailyCapacity: 50_000,
      estimatedExitDays: 2,
      planningHorizon: "one_to_three_days",
    });
  });

  it.each([
    [0.999, "under_one_day"],
    [1, "one_to_three_days"],
    [3, "one_to_three_days"],
    [3.001, "three_to_seven_days"],
    [7, "three_to_seven_days"],
    [7.001, "over_seven_days"],
  ] as const)("classifies %s days as %s", (days, expected) => {
    expect(classifyExitPlanningHorizon(days)).toBe(expected);
  });

  it("preserves missing volume instead of treating it as zero", () => {
    expect(
      calculateExitCapacity({
        positionValue: 100_000,
        volume24h: null,
        participationRate: 0.05,
        stressHaircut: 0,
      }),
    ).toEqual({ status: "unavailable", reason: "MISSING_VOLUME" });
  });

  it("rejects a participation rate above the approved limit", () => {
    expect(
      calculateExitCapacity({
        positionValue: 100_000,
        volume24h: 2_000_000,
        participationRate: 0.21,
        stressHaircut: 0,
      }),
    ).toEqual({ status: "unavailable", reason: "INVALID_SCENARIO" });
  });
});
