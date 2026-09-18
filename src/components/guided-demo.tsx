"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { calculateExitCapacity } from "@/domain/analysis/exit-capacity";
import {
  type AssetDetailResponse,
  getAssetDetail,
  getExplorer,
  RwaApiError,
} from "@/lib/rwa-api";

const positionPresets = [10_000, 100_000, 500_000, 1_000_000];
const participationPresets = [0.01, 0.05, 0.1];
const haircutPresets = [0, 0.25, 0.5, 0.75];

export function GuidedDemo() {
  const searchParams = useSearchParams();
  const requestedId = parseRwaId(searchParams.get("asset"));
  const [position, setPosition] = useState(100_000);
  const [participation, setParticipation] = useState(0.05);
  const [haircut, setHaircut] = useState(0);

  const discovery = useQuery({
    queryKey: ["guided-demo-discovery"],
    enabled: requestedId === null,
    refetchInterval: 60_000,
    queryFn: async () => {
      const government = await getExplorer({
        assetType: "government_security",
        sort: "tokenized_volume_24h",
        sortDir: "desc",
        limit: 10,
      });
      if (government.items.length > 0) {
        return { result: government, fallbackUsed: false };
      }
      const fallback = await getExplorer({
        sort: "tokenized_volume_24h",
        sortDir: "desc",
        limit: 20,
      });
      return { result: fallback, fallbackUsed: true };
    },
  });

  const discoveredAsset =
    discovery.data?.result.items.find(
      (asset) => asset.quote.tokenizedVolume24h !== null,
    ) ?? discovery.data?.result.items[0];
  const selectedId = requestedId ?? discoveredAsset?.rwaId ?? null;
  const detail = useQuery({
    queryKey: ["asset-detail", selectedId],
    enabled: selectedId !== null,
    refetchInterval: 60_000,
    queryFn: () => getAssetDetail(selectedId!),
  });

  const scenario = useMemo(
    () =>
      calculateExitCapacity({
        positionValue: position,
        volume24h: detail.data?.asset.quote.tokenizedVolume24h ?? null,
        participationRate: participation,
        stressHaircut: haircut,
      }),
    [
      detail.data?.asset.quote.tokenizedVolume24h,
      haircut,
      participation,
      position,
    ],
  );

  const isLoading =
    (requestedId === null && discovery.isLoading) ||
    (selectedId !== null && detail.isLoading);
  const error = discovery.error ?? detail.error;

  return (
    <section
      id="demo"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
    >
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Guided live scenario</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Test observed market capacity
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Start with a $100,000 position and adjust how much of reported
            24-hour volume you are willing to participate in.
          </p>
        </div>
        <Link className="button-secondary" href="/assets">
          Explore all assets{" "}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {isLoading ? <DemoSkeleton /> : null}
      {error ? (
        <DemoError
          error={error}
          retry={() =>
            void (detail.error ? detail.refetch() : discovery.refetch())
          }
        />
      ) : null}
      {!isLoading && !error && selectedId === null ? <EmptyDemo /> : null}
      {detail.data ? (
        <div className="space-y-4">
          {discovery.data?.fallbackUsed && requestedId === null ? (
            <StatusBanner tone="warning">
              No government-security assets are currently returned by CMC.
              Showing the highest-volume valid RWA as a transparent fallback.
            </StatusBanner>
          ) : null}
          {detail.data.stale ? (
            <StatusBanner tone="warning">
              Live refresh is unavailable. This view uses the latest real cached
              observation and is explicitly marked stale.
            </StatusBanner>
          ) : null}
          {detail.data.dataGaps.some((gap) => gap.source === "marketPairs") ? (
            <StatusBanner tone="neutral">
              Market-pair evidence is unavailable. Exit Capacity uses aggregate
              reported volume; concentration and price dispersion are not
              inferred.
            </StatusBanner>
          ) : null}

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <AssetSummary data={detail.data} />
            <div className="grid border-t border-slate-200 lg:grid-cols-[0.82fr_1.18fr] dark:border-slate-800">
              <ScenarioControls
                position={position}
                participation={participation}
                haircut={haircut}
                onPosition={setPosition}
                onParticipation={setParticipation}
                onHaircut={setHaircut}
              />
              <ScenarioResults scenario={scenario} />
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Capacity estimate based on observed 24-hour volume. It does not
            model order-book depth, slippage, fees, redemption restrictions, or
            guaranteed execution. Not investment advice.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function AssetSummary({ data }: { data: AssetDetailResponse }) {
  const { asset, analysis } = data;
  return (
    <div className="p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-slate-950 font-mono text-sm font-bold text-white dark:bg-white dark:text-slate-950">
            {asset.symbol.slice(0, 4)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold">{asset.name}</h3>
              <span className="data-badge">
                {formatAssetType(asset.assetType)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {asset.symbol} · CMC RWA #{asset.rwaId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span
            className="size-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          Observed {formatRelativeTime(analysis.calculatedAt)}
        </div>
      </div>

      <dl className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Average tokenized price"
          value={formatCurrency(asset.quote.averageTokenizedPrice)}
        />
        <Metric
          label="Tokenized market cap"
          value={formatCompactCurrency(asset.quote.tokenizedMarketCap)}
        />
        <Metric
          label="Reported volume · 24h"
          value={formatCompactCurrency(asset.quote.tokenizedVolume24h)}
        />
        <Metric
          label="Turnover ratio"
          value={formatPercent(analysis.metrics.turnoverRatio)}
        />
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <EvidencePill
          icon={<ShieldCheck className="size-4" aria-hidden="true" />}
          label="Evidence coverage"
          value={`${analysis.evidenceCoverage.score}/100 · ${analysis.evidenceCoverage.label}`}
        />
        <EvidencePill
          icon={<Gauge className="size-4" aria-hidden="true" />}
          label="Market Capacity Health"
          value={
            analysis.marketCapacityHealth.score === null
              ? "Insufficient evidence"
              : `${Math.round(analysis.marketCapacityHealth.score)}/100`
          }
        />
        <EvidencePill
          icon={<Database className="size-4" aria-hidden="true" />}
          label="Methodology"
          value={`Version ${analysis.methodologyVersion}`}
        />
      </div>
    </div>
  );
}

function ScenarioControls(props: {
  position: number;
  participation: number;
  haircut: number;
  onPosition(value: number): void;
  onParticipation(value: number): void;
  onHaircut(value: number): void;
}) {
  return (
    <div className="bg-slate-50/80 p-5 sm:p-7 dark:bg-slate-950/45">
      <p className="eyebrow">Scenario inputs</p>
      <fieldset className="mt-5">
        <legend className="input-label">Position value</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {positionPresets.map((value) => (
            <PresetButton
              key={value}
              active={props.position === value}
              onClick={() => props.onPosition(value)}
            >
              {formatCompactCurrency(value)}
            </PresetButton>
          ))}
        </div>
        <label className="mt-2 block">
          <span className="sr-only">Custom position value in USD</span>
          <input
            className="control-input"
            type="number"
            min="1"
            step="1000"
            value={props.position}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (Number.isFinite(value) && value > 0) props.onPosition(value);
            }}
          />
        </label>
      </fieldset>
      <fieldset className="mt-5">
        <legend className="input-label">Volume participation</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {participationPresets.map((value) => (
            <PresetButton
              key={value}
              active={props.participation === value}
              onClick={() => props.onParticipation(value)}
            >
              {formatPercent(value)}
            </PresetButton>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span className="sr-only">Custom volume participation rate</span>
          <input
            className="w-full accent-blue-600"
            type="range"
            min="0.1"
            max="20"
            step="0.1"
            value={props.participation * 100}
            onChange={(event) =>
              props.onParticipation(event.currentTarget.valueAsNumber / 100)
            }
          />
          <output className="w-12 text-right font-semibold text-slate-700 tabular-nums dark:text-slate-200">
            {formatPercent(props.participation)}
          </output>
        </label>
      </fieldset>
      <fieldset className="mt-5">
        <legend className="input-label">Stress haircut</legend>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {haircutPresets.map((value) => (
            <PresetButton
              key={value}
              active={props.haircut === value}
              onClick={() => props.onHaircut(value)}
            >
              {formatPercent(value)}
            </PresetButton>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span className="sr-only">Custom stress haircut</span>
          <input
            className="w-full accent-blue-600"
            type="range"
            min="0"
            max="90"
            step="1"
            value={props.haircut * 100}
            onChange={(event) =>
              props.onHaircut(event.currentTarget.valueAsNumber / 100)
            }
          />
          <output className="w-12 text-right font-semibold text-slate-700 tabular-nums dark:text-slate-200">
            {formatPercent(props.haircut)}
          </output>
        </label>
      </fieldset>
    </div>
  );
}

function ScenarioResults({
  scenario,
}: {
  scenario: ReturnType<typeof calculateExitCapacity>;
}) {
  if (scenario.status === "unavailable") {
    return (
      <div className="grid min-h-72 place-items-center p-7 text-center">
        <div>
          <AlertTriangle
            className="mx-auto size-7 text-amber-500"
            aria-hidden="true"
          />
          <h3 className="mt-3 font-semibold">No observed capacity</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Reported aggregate volume is unavailable or zero for this asset.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-5 sm:p-7">
      <p className="eyebrow">Scenario result</p>
      <div className="mt-5 flex items-end gap-3">
        <span className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
          {formatDays(scenario.estimatedExitDays)}
        </span>
        <span className="pb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          estimated exit days
        </span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
        This is a volume-participation scenario—not a promise of execution or a
        slippage estimate.
      </p>
      <dl className="mt-7 grid gap-3 sm:grid-cols-3">
        <ResultMetric
          icon={<BarChart3 />}
          label="Effective volume"
          value={formatCompactCurrency(scenario.effectiveVolume)}
        />
        <ResultMetric
          icon={<Gauge />}
          label="Daily exit capacity"
          value={formatCompactCurrency(scenario.dailyCapacity)}
        />
        <ResultMetric
          icon={<Clock3 />}
          label="Position / volume"
          value={formatPercent(scenario.positionToVolumeRatio)}
        />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EvidencePill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
      <span className="text-blue-600 dark:text-blue-400">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="block truncate text-xs font-semibold">{value}</span>
      </span>
    </div>
  );
}

function ResultMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30">
      <span className="text-blue-600 dark:text-blue-400">{icon}</span>
      <dt className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function PresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active ? "preset-button preset-button-active" : "preset-button"
      }
    >
      {children}
    </button>
  );
}

function StatusBanner({
  tone,
  children,
}: {
  tone: "warning" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === "warning"
          ? "status-banner status-banner-warning"
          : "status-banner"
      }
    >
      {tone === "warning" ? (
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
      )}
      <p>{children}</p>
    </div>
  );
}

function DemoError({ error, retry }: { error: unknown; retry(): void }) {
  const rateLimited = error instanceof RwaApiError && error.status === 429;
  return (
    <div
      className="rounded-3xl border border-rose-200 bg-rose-50 p-7 dark:border-rose-900 dark:bg-rose-950/30"
      role="alert"
    >
      <AlertTriangle className="size-6 text-rose-600" aria-hidden="true" />
      <h3 className="mt-3 font-semibold">
        {rateLimited
          ? "Refresh limit reached"
          : "Live data is temporarily unavailable"}
      </h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {rateLimited
          ? "Wait a moment before refreshing again."
          : "No synthetic data is shown. Retry the real data request when the upstream service is available."}
      </p>
      <button className="button-secondary mt-5" type="button" onClick={retry}>
        <RefreshCw className="size-4" aria-hidden="true" /> Retry
      </button>
    </div>
  );
}

function DemoSkeleton() {
  return (
    <div
      className="animate-pulse rounded-3xl border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900"
      aria-label="Loading live RWA data"
    >
      <div className="h-12 w-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800"
          />
        ))}
      </div>
      <span className="sr-only">Loading live RWA data</span>
    </div>
  );
}

function EmptyDemo() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <Database className="mx-auto size-7 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 font-semibold">
        No valid RWA is currently available
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        The app will not substitute fixture or synthetic market data.
      </p>
    </div>
  );
}

function parseRwaId(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatCurrency(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: value < 1 ? 4 : 2,
      }).format(value);
}

function formatCompactCurrency(value: number | null) {
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
  if (value < 0.1) return "<0.1";
  if (value >= 1_000) return ">999";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);
}

function formatAssetType(value: string) {
  return value.replaceAll("_", " ");
}

function formatRelativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}
