import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ExitPlanningHorizon } from "@/domain/analysis";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const planningHorizonLabels = {
  under_one_day: "Under 1 day",
  one_to_three_days: "1–3 days",
  three_to_seven_days: "3–7 days",
  over_seven_days: "Over 7 days",
} satisfies Record<ExitPlanningHorizon, string>;

export function formatPlanningHorizon(value: ExitPlanningHorizon): string {
  return planningHorizonLabels[value];
}
