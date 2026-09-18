export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export function percentileRank(value: number, population: readonly number[]) {
  if (population.length === 0) return null;
  const below = population.filter((candidate) => candidate < value).length;
  const equal = population.filter((candidate) => candidate === value).length;
  return ((below + equal * 0.5) / population.length) * 100;
}

export function interpolateThresholdScore(
  value: number,
  thresholds: readonly { value: number; score: number }[],
) {
  if (thresholds.length === 0) return null;
  const sorted = [...thresholds].sort(
    (left, right) => left.value - right.value,
  );
  if (value <= sorted[0]!.value) return sorted[0]!.score;
  if (value >= sorted.at(-1)!.value) return sorted.at(-1)!.score;

  for (let index = 1; index < sorted.length; index += 1) {
    const upper = sorted[index]!;
    const lower = sorted[index - 1]!;
    if (value <= upper.value) {
      const progress = (value - lower.value) / (upper.value - lower.value);
      return lower.score + progress * (upper.score - lower.score);
    }
  }
  return null;
}
