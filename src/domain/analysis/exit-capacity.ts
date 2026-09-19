import { ANALYSIS_CONFIG } from "./config";

export const EXIT_SCENARIO_LIMITS = {
  participationRate: { min: 0.001, max: 0.2 },
  stressHaircut: { min: 0, max: 0.9 },
} as const;

export type ExitCapacityInput = {
  positionValue: number;
  volume24h: number | null;
  participationRate: number;
  stressHaircut: number;
};

export type ExitPlanningHorizon =
  | "under_one_day"
  | "one_to_three_days"
  | "three_to_seven_days"
  | "over_seven_days";

export type ExitCapacityResult =
  | {
      status: "available";
      effectiveVolume: number;
      dailyCapacity: number;
      estimatedExitDays: number;
      planningHorizon: ExitPlanningHorizon;
      positionToVolumeRatio: number;
    }
  | {
      status: "unavailable";
      reason:
        | "INVALID_POSITION"
        | "MISSING_VOLUME"
        | "NO_OBSERVED_CAPACITY"
        | "INVALID_SCENARIO";
    };

export function calculateExitCapacity(
  input: ExitCapacityInput,
): ExitCapacityResult {
  if (!Number.isFinite(input.positionValue) || input.positionValue <= 0) {
    return { status: "unavailable", reason: "INVALID_POSITION" };
  }

  if (input.volume24h === null || !Number.isFinite(input.volume24h)) {
    return { status: "unavailable", reason: "MISSING_VOLUME" };
  }

  if (input.volume24h <= 0) {
    return { status: "unavailable", reason: "NO_OBSERVED_CAPACITY" };
  }

  const participationLimit = EXIT_SCENARIO_LIMITS.participationRate;
  const haircutLimit = EXIT_SCENARIO_LIMITS.stressHaircut;
  const invalidScenario =
    !Number.isFinite(input.participationRate) ||
    !Number.isFinite(input.stressHaircut) ||
    input.participationRate < participationLimit.min ||
    input.participationRate > participationLimit.max ||
    input.stressHaircut < haircutLimit.min ||
    input.stressHaircut > haircutLimit.max;

  if (invalidScenario) {
    return { status: "unavailable", reason: "INVALID_SCENARIO" };
  }

  const effectiveVolume = input.volume24h * (1 - input.stressHaircut);
  const dailyCapacity = effectiveVolume * input.participationRate;

  if (dailyCapacity <= 0) {
    return { status: "unavailable", reason: "NO_OBSERVED_CAPACITY" };
  }

  const estimatedExitDays = input.positionValue / dailyCapacity;
  return {
    status: "available",
    effectiveVolume,
    dailyCapacity,
    estimatedExitDays,
    planningHorizon: classifyExitPlanningHorizon(estimatedExitDays),
    positionToVolumeRatio: input.positionValue / input.volume24h,
  };
}

export function classifyExitPlanningHorizon(
  estimatedExitDays: number,
): ExitPlanningHorizon {
  const thresholds = ANALYSIS_CONFIG.exitPlanningHorizonDays;
  if (estimatedExitDays < thresholds.underOneDayMaxExclusive) {
    return "under_one_day";
  }
  if (estimatedExitDays <= thresholds.oneToThreeDaysMaxInclusive) {
    return "one_to_three_days";
  }
  if (estimatedExitDays <= thresholds.threeToSevenDaysMaxInclusive) {
    return "three_to_seven_days";
  }
  return "over_seven_days";
}
