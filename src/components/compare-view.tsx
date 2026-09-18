"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  GitCompareArrows,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  compareAssets,
  type CompareResponse,
  type ExplorerItem,
  getExplorer,
  RwaApiError,
} from "@/lib/rwa-api";

export function CompareView() {
  const [selected, setSelected] = useState<number[]>([]);
  const [positionValue, setPositionValue] = useState(100_000);
  const [participationRate, setParticipationRate] = useState(0.05);
  const [stressHaircut, setStressHaircut] = useState(0);
  const universe = useQuery({
    queryKey: ["compare-universe"],
    queryFn: () =>
      getExplorer({
        sort: "tokenized_volume_24h",
        sortDir: "desc",
        limit: 40,
      }),
    refetchInterval: 60_000,
  });
  const suggested = useMemo(
    () => suggestPeers(universe.data?.items ?? []),
    [universe.data?.items],
  );
  const selectedIds = selected.length > 0 ? selected : suggested;
  const comparison = useMutation({
    mutationFn: () =>
      compareAssets({
        rwaIds: selectedIds,
        positionValue,
        participationRate,
        stressHaircut,
      }),
  });

  function toggle(rwaId: number) {
    const current = selected.length > 0 ? selected : suggested;
    setSelected(
      current.includes(rwaId)
        ? current.filter((id) => id !== rwaId)
        : current.length < 4
          ? [...current, rwaId]
          : current,
    );
    comparison.reset();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Shared scenario · 2–4 assets</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Compare market capacity
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Apply the same position, participation rate, and stress haircut to
            every asset. Results are ordered by estimated exit days—not labeled
            as a recommendation.
          </p>
        </div>
        <Link className="button-secondary" href="/assets">
          Edit universe <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Select assets</h2>
            <p className="mt-1 text-xs text-slate-500">
              Suggested peers favor the same asset category when available.
            </p>
          </div>
          <span className="data-badge">{selectedIds.length}/4 selected</span>
        </div>
        {universe.isLoading ? <SelectionSkeleton /> : null}
        {universe.error ? (
          <InlineError retry={() => void universe.refetch()} />
        ) : null}
        {universe.data ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {universe.data.items.slice(0, 16).map((asset) => {
              const active = selectedIds.includes(asset.rwaId);
              return (
                <label
                  key={asset.rwaId}
                  className={
                    active
                      ? "flex cursor-pointer items-center gap-3 rounded-xl border border-blue-500 bg-blue-50 p-3 dark:bg-blue-950/30"
                      : "flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-blue-300 dark:border-slate-700"
                  }
                >
                  <input
                    className="sr-only"
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(asset.rwaId)}
                  />
                  <span
                    className={
                      active
                        ? "grid size-5 place-items-center rounded-md bg-blue-600 text-white"
                        : "size-5 rounded-md border border-slate-300 dark:border-slate-600"
                    }
                    aria-hidden="true"
                  >
                    {active ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {asset.symbol}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {asset.name}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Shared scenario</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          <label>
            <span className="input-label">Position value · USD</span>
            <input
              className="control-input mt-2"
              type="number"
              min="1"
              max="1000000000"
              value={positionValue}
              onChange={(event) => {
                const value = event.currentTarget.valueAsNumber;
                if (Number.isFinite(value) && value > 0)
                  setPositionValue(value);
              }}
            />
          </label>
          <CompareRange
            id="compare-participation"
            label="Volume participation"
            value={participationRate * 100}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(value) => setParticipationRate(value / 100)}
          />
          <CompareRange
            id="compare-haircut"
            label="Stress haircut"
            value={stressHaircut * 100}
            min={0}
            max={90}
            step={1}
            onChange={(value) => setStressHaircut(value / 100)}
          />
        </div>
        <button
          className="button-primary mt-5"
          type="button"
          disabled={
            selectedIds.length < 2 ||
            selectedIds.length > 4 ||
            comparison.isPending
          }
          onClick={() => comparison.mutate()}
        >
          <GitCompareArrows className="size-4" aria-hidden="true" />
          {comparison.isPending ? "Comparing real data…" : "Run comparison"}
        </button>
      </section>

      {comparison.error ? (
        <CompareError
          error={comparison.error}
          retry={() => comparison.mutate()}
        />
      ) : null}
      {comparison.data ? <ComparisonResults data={comparison.data} /> : null}
    </div>
  );
}

function ComparisonResults({ data }: { data: CompareResponse }) {
  return (
    <section className="mt-8" aria-labelledby="comparison-results">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Neutral ordering</p>
          <h2
            id="comparison-results"
            className="mt-2 text-2xl font-semibold tracking-tight"
          >
            Scenario comparison
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          {formatMoney(data.scenario.positionValue)} ·{" "}
          {formatPercent(data.scenario.participationRate)} participation ·{" "}
          {formatPercent(data.scenario.stressHaircut)} haircut
        </p>
      </div>

      {data.stale ? (
        <div className="status-banner status-banner-warning mt-4">
          <AlertTriangle className="size-4 shrink-0" /> At least one result uses
          labeled stale real data.
        </div>
      ) : null}
      {data.failures.length > 0 ? (
        <div className="status-banner status-banner-warning mt-4">
          <AlertTriangle className="size-4 shrink-0" />
          {data.failures.length} requested asset(s) could not be compared; the
          available results remain visible.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {data.items.map((item, index) => (
          <article
            key={item.asset.rwaId}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] text-slate-400">
                  ORDER {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 font-semibold">{item.asset.name}</h3>
                <p className="text-xs text-slate-500">{item.asset.symbol}</p>
              </div>
              <span className="data-badge">
                {item.analysis.evidenceCoverage.label}
              </span>
            </div>
            <div className="mt-6">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">
                {item.analysis.scenario.status === "available"
                  ? formatDays(item.analysis.scenario.estimatedExitDays)
                  : "—"}
              </span>
              <span className="ml-2 text-xs text-slate-500">exit days</span>
            </div>
            <dl className="mt-5 space-y-2 text-xs">
              <CompareMetric
                label="Daily capacity"
                value={
                  item.analysis.scenario.status === "available"
                    ? formatMoney(item.analysis.scenario.dailyCapacity)
                    : "Unavailable"
                }
              />
              <CompareMetric
                label="Turnover"
                value={formatPercent(item.analysis.metrics.turnoverRatio)}
              />
              <CompareMetric
                label="Top market share"
                value={formatPercent(
                  item.analysis.concentration.market.top1Share,
                )}
              />
              <CompareMetric
                label="Health"
                value={
                  item.analysis.marketCapacityHealth.score === null
                    ? "Insufficient evidence"
                    : `${Math.round(item.analysis.marketCapacityHealth.score)}/100`
                }
              />
              <CompareMetric
                label="Evidence"
                value={`${item.analysis.evidenceCoverage.score}/100`}
              />
            </dl>
            {item.dataGaps.length > 0 ? (
              <p className="mt-4 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
                {item.dataGaps.length} evidence gap(s); unavailable metrics are
                not ranked as zero.
              </p>
            ) : null}
            <Link
              className="mt-4 inline-flex text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              href={`/assets/${item.asset.rwaId}`}
            >
              Open Asset X-Ray
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Ordering is a scenario convenience, not a “best asset” ranking or
        investment recommendation. Reported volume is not order-book depth.
      </p>
    </section>
  );
}

function CompareRange(props: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange(value: number): void;
}) {
  return (
    <label htmlFor={props.id}>
      <span className="flex justify-between text-xs font-semibold">
        <span>{props.label}</span>
        <output>{formatPercent(props.value / 100)}</output>
      </span>
      <input
        id={props.id}
        className="mt-4 w-full accent-blue-600"
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}

function CompareMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function SelectionSkeleton() {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

function InlineError({ retry }: { retry(): void }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-rose-50 p-4 text-sm dark:bg-rose-950/30">
      <span>Real asset candidates could not be loaded.</span>
      <button className="button-secondary" type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}

function CompareError({ error, retry }: { error: unknown; retry(): void }) {
  const rateLimited = error instanceof RwaApiError && error.status === 429;
  return (
    <div
      className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/30"
      role="alert"
    >
      <AlertTriangle className="size-6 text-rose-500" />
      <h2 className="mt-3 font-semibold">
        {rateLimited
          ? "Comparison rate limit reached"
          : "Comparison unavailable"}
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        No synthetic comparison is substituted. Retry the real-data analysis.
      </p>
      <button className="button-secondary mt-4" type="button" onClick={retry}>
        <RefreshCw className="size-4" /> Retry
      </button>
    </div>
  );
}

function suggestPeers(items: ExplorerItem[]) {
  const first = items[0];
  if (!first) return [];
  const peers = items
    .filter(
      (asset) =>
        asset.rwaId !== first.rwaId && asset.assetType === first.assetType,
    )
    .slice(0, 3);
  const fallback = items
    .filter(
      (asset) =>
        asset.rwaId !== first.rwaId &&
        !peers.some((peer) => peer.rwaId === asset.rwaId),
    )
    .slice(0, Math.max(0, 3 - peers.length));
  return [first, ...peers, ...fallback].slice(0, 4).map((asset) => asset.rwaId);
}

function formatMoney(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);
}

function formatPercent(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(value);
}

function formatDays(value: number) {
  return value < 0.1
    ? "<0.1"
    : value >= 1_000
      ? ">999"
      : new Intl.NumberFormat("en-US", {
          maximumFractionDigits: value < 10 ? 1 : 0,
        }).format(value);
}
