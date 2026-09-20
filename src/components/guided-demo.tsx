"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
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

import { type GlossaryTerm, TechnicalTerm } from "@/components/technical-term";
import { calculateExitCapacity } from "@/domain/analysis/exit-capacity";
import { formatPlanningHorizon } from "@/lib/utils";
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
  const reduceMotion = useReducedMotion();
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
      className="relative mx-auto max-w-[1600px] px-5 py-12 sm:px-8 lg:px-14 lg:py-16"
    >
      <div className="pointer-events-none absolute top-0 left-1/2 h-72 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(29,219,211,0.07),transparent_68%)]" />
      <motion.div
        className="relative mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.2, 0.75, 0.25, 1] }}
      >
        <div>
          <p className="fx-kicker">Guided live scenario</p>
          <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em] text-[#edf8f6] sm:text-3xl">
            Stress-test{" "}
            <TechnicalTerm term="observedMarketCapacity">
              observed market capacity
            </TechnicalTerm>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#78999b]">
            Apply one transparent volume-participation scenario to live RWA
            observations.
          </p>
        </div>
        <Link className="fx-text-link" href="/assets">
          Explore all assets
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </motion.div>

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
        <div className="relative space-y-3">
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

          <motion.div
            className="fx-dashboard-frame"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.75, 0.25, 1] }}
          >
            <div className="fx-dashboard-header">
              <span className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#50eee7]" />
                Live scenario terminal
              </span>
              <span className="hidden text-[9px] tracking-[0.2em] text-[#47787a] uppercase md:block">
                Stress test today. Allocate with clearer evidence tomorrow.
              </span>
            </div>
            <div className="grid xl:grid-cols-[0.78fr_1.42fr_0.72fr]">
              <ScenarioControls
                position={position}
                participation={participation}
                haircut={haircut}
                onPosition={setPosition}
                onParticipation={setParticipation}
                onHaircut={setHaircut}
              />
              <div className="border-[#153b3d] xl:border-x">
                <AssetSummary data={detail.data} />
                <ScenarioResults scenario={scenario} />
              </div>
              <EvidenceSidebar data={detail.data} />
            </div>
          </motion.div>

          <p className="font-mono text-[10px] leading-5 tracking-[0.06em] text-[#557b7d]">
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
          <div className="grid size-14 place-items-center border border-[#286b6e] bg-[#092326] font-mono text-xs font-bold tracking-wider text-[#6df8f1] shadow-[inset_0_0_24px_rgba(42,224,216,0.08)]">
            {asset.symbol.slice(0, 4)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-medium tracking-tight text-[#f0f7f5]">
                {asset.name}
              </h3>
              <span className="fx-data-badge">
                {formatAssetType(asset.assetType)}
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-[#64888a] uppercase">
              {asset.symbol} · CMC RWA #{asset.rwaId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-wider text-[#628a8c] uppercase">
          <LiveDot />
          Observed {formatRelativeTime(analysis.calculatedAt)}
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 border-y border-[#14383a] lg:grid-cols-4">
        <Metric
          label={<TechnicalTerm term="averageTokenizedPrice" />}
          value={formatCurrency(asset.quote.averageTokenizedPrice)}
        />
        <Metric
          label={<TechnicalTerm term="tokenizedMarketCap" align="right" />}
          value={formatCompactCurrency(asset.quote.tokenizedMarketCap)}
        />
        <Metric
          label={<TechnicalTerm term="reportedVolume24h" />}
          value={formatCompactCurrency(asset.quote.tokenizedVolume24h)}
        />
        <Metric
          label={<TechnicalTerm term="turnoverRatio" align="right" />}
          value={formatPercent(analysis.metrics.turnoverRatio)}
        />
      </dl>
    </div>
  );
}

function EvidenceSidebar({ data }: { data: AssetDetailResponse }) {
  const evidence = data.analysis.evidenceCoverage;
  const health = data.analysis.marketCapacityHealth;
  return (
    <aside className="grid gap-7 bg-[#041113]/80 p-5 sm:p-7 xl:content-start">
      <ScoreDial
        label="Evidence coverage"
        term="evidenceCoverage"
        score={evidence.score}
        status={evidence.label}
        tone="cyan"
      />
      <ScoreDial
        label="Market capacity health"
        term="marketCapacityHealth"
        score={health.score}
        status={health.status === "available" ? "Observed" : "Unavailable"}
        tone="amber"
      />
      <div className="border border-[#1b5052] bg-[#07191b] p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-[#5ef3ec]" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-[#dcebea]">
              Same asset. A clearer picture.
            </p>
            <p className="mt-1 font-mono text-[8px] tracking-[0.22em] text-[#65999b] uppercase">
              Methodology v{data.analysis.methodologyVersion}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LiveDot() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      className="size-1.5 rounded-full bg-[#48eae2] shadow-[0_0_8px_#48eae2]"
      animate={
        reduceMotion
          ? undefined
          : { opacity: [0.45, 1, 0.45], scale: [0.86, 1.2, 0.86] }
      }
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    />
  );
}

function ScoreDial({
  label,
  score,
  status,
  tone,
  term,
}: {
  label: string;
  score: number | null;
  status: string;
  tone: "cyan" | "amber";
  term: GlossaryTerm;
}) {
  const reduceMotion = useReducedMotion();
  const value = score === null ? 0 : Math.round(score);
  const color = tone === "cyan" ? "#50eee7" : "#ffd096";
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.16em] text-[#b0c5c5] uppercase">
        <TechnicalTerm term={term}>{label}</TechnicalTerm>
      </div>
      <div className="mt-4 flex items-center gap-5">
        <motion.div
          className="grid size-24 shrink-0 place-items-center rounded-full p-[7px]"
          style={{
            background: `conic-gradient(${color} ${value * 3.6}deg, #173234 0deg)`,
          }}
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1, 1.025, 1],
                  filter: [
                    "drop-shadow(0 0 0 rgba(67,229,221,0))",
                    "drop-shadow(0 0 10px rgba(67,229,221,0.14))",
                    "drop-shadow(0 0 0 rgba(67,229,221,0))",
                  ],
                }
          }
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          aria-label={`${label}: ${score === null ? "unavailable" : `${value} out of 100`}`}
        >
          <div className="grid size-full place-items-center rounded-full bg-[#061315] text-center shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
            <span>
              <strong className="block text-2xl font-medium" style={{ color }}>
                {score === null ? "—" : value}
              </strong>
              <span className="font-mono text-[8px] text-[#668789]">/ 100</span>
            </span>
          </div>
        </motion.div>
        <div>
          <p className="text-sm font-semibold" style={{ color }}>
            {status}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#668789]">
            Transparent coverage based on currently available observations.
          </p>
        </div>
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
    <div className="bg-[#041113]/80 p-5 sm:p-7">
      <p className="fx-kicker">Scenario inputs</p>
      <fieldset className="mt-6">
        <legend className="input-label">01 · Position value</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
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
      <fieldset className="mt-7 border-t border-[#14383a] pt-6">
        <legend className="input-label">
          02 · <TechnicalTerm term="volumeParticipation" />
        </legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
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
        <label className="mt-4 flex items-center gap-3 text-xs text-[#64888a]">
          <span className="sr-only">Custom volume participation rate</span>
          <input
            className="fx-range w-full"
            type="range"
            min="0.1"
            max="20"
            step="0.1"
            value={props.participation * 100}
            onChange={(event) =>
              props.onParticipation(event.currentTarget.valueAsNumber / 100)
            }
          />
          <output className="w-12 text-right font-mono text-xs font-semibold text-[#d5e8e6] tabular-nums">
            {formatPercent(props.participation)}
          </output>
        </label>
      </fieldset>
      <fieldset className="mt-7 border-t border-[#14383a] pt-6">
        <legend className="input-label">
          03 · <TechnicalTerm term="stressHaircut" />
        </legend>
        <div className="mt-3 grid grid-cols-4 gap-2">
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
        <label className="mt-4 flex items-center gap-3 text-xs text-[#64888a]">
          <span className="sr-only">Custom stress haircut</span>
          <input
            className="fx-range w-full"
            type="range"
            min="0"
            max="90"
            step="1"
            value={props.haircut * 100}
            onChange={(event) =>
              props.onHaircut(event.currentTarget.valueAsNumber / 100)
            }
          />
          <output className="w-12 text-right font-mono text-xs font-semibold text-[#d5e8e6] tabular-nums">
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
      <div className="grid min-h-72 place-items-center border-t border-[#14383a] p-7 text-center">
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
    <div className="border-t border-[#14383a] p-5 sm:p-7">
      <p className="fx-kicker">Scenario result</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <span className="fx-result-value text-5xl font-medium tracking-[-0.055em] tabular-nums sm:text-6xl">
          {formatDays(scenario.estimatedExitDays)}
        </span>
        <span className="pb-2 font-mono text-[10px] tracking-[0.12em] text-[#66898b] uppercase">
          <TechnicalTerm term="estimatedExitDays">
            estimated exit days
          </TechnicalTerm>
        </span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[#85a4a5]">
        This is a volume-participation scenario—not a promise of execution or a
        slippage estimate.
      </p>
      <div className="mt-4 inline-flex flex-wrap items-center gap-2 border border-[#1c5557] bg-[#061719] px-3 py-2">
        <span className="font-mono text-[9px] tracking-[0.08em] text-[#6c9293] uppercase">
          <TechnicalTerm term="planningHorizon" />
        </span>
        <strong className="font-mono text-xs text-[#69ebe5]">
          {formatPlanningHorizon(scenario.planningHorizon)}
        </strong>
      </div>
      <dl className="mt-7 grid border-y border-[#14383a] sm:grid-cols-3">
        <ResultMetric
          icon={<BarChart3 />}
          label={<TechnicalTerm term="effectiveVolume" />}
          value={formatCompactCurrency(scenario.effectiveVolume)}
        />
        <ResultMetric
          icon={<Gauge />}
          label={<TechnicalTerm term="dailyExitCapacity" />}
          value={formatCompactCurrency(scenario.dailyCapacity)}
        />
        <ResultMetric
          icon={<Clock3 />}
          label={<TechnicalTerm term="positionToVolume" align="right" />}
          value={formatPercent(scenario.positionToVolumeRatio)}
        />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="border-r border-[#14383a] px-3 py-5 last:border-r-0">
      <dt className="text-[10px] leading-4 text-[#658789]">{label}</dt>
      <dd className="mt-2 text-lg font-medium tracking-tight text-[#e7f3f1] tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function ResultMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement<{ className?: string }>;
  label: React.ReactNode;
  value: string;
}) {
  return (
    <div className="border-r border-[#14383a] px-3 py-5 last:border-r-0">
      <dt className="text-[10px] text-[#64888a]">
        <span
          className="mb-3 block text-[#51eae3] [&>svg]:size-4"
          aria-hidden="true"
        >
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[#e3f0ee] tabular-nums">
        {value}
      </dd>
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
    <div className="fx-skeleton" aria-label="Loading live RWA data">
      <div className="fx-skeleton-header">
        <span className="flex items-center gap-3">
          <span className="h-px w-8 bg-[#4edfd8]" />
          Establishing live data link
        </span>
        <span className="fx-skeleton-status">Synchronizing</span>
      </div>
      <div className="grid xl:grid-cols-[0.78fr_1.42fr_0.72fr]">
        <div className="space-y-7 p-5 sm:p-7">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index}>
              <div className="fx-skeleton-line h-2.5 w-32" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((__, itemIndex) => (
                  <div key={itemIndex} className="fx-skeleton-cell h-10" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-[#153b3d] p-5 sm:p-7 xl:border-x">
          <div className="flex items-center gap-4">
            <div className="fx-skeleton-cell size-14 shrink-0" />
            <div className="w-full space-y-3">
              <div className="fx-skeleton-line h-4 w-2/5" />
              <div className="fx-skeleton-line h-2 w-1/4" />
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-px border border-[#123537] bg-[#123537] lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 bg-[#051315] p-4">
                <div className="fx-skeleton-line h-2 w-4/5" />
                <div className="fx-skeleton-line mt-4 h-4 w-3/5" />
              </div>
            ))}
          </div>
          <div className="fx-skeleton-line mt-9 h-2.5 w-28" />
          <div className="fx-skeleton-line mt-5 h-14 w-3/5" />
          <div className="fx-skeleton-line mt-5 h-2.5 w-full" />
        </div>
        <div className="space-y-9 p-5 sm:p-7">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index}>
              <div className="fx-skeleton-line h-2.5 w-36" />
              <div className="mt-5 flex items-center gap-4">
                <div className="fx-skeleton-dial size-20 shrink-0 rounded-full" />
                <div className="w-full space-y-3">
                  <div className="fx-skeleton-line h-3 w-1/2" />
                  <div className="fx-skeleton-line h-2 w-full" />
                  <div className="fx-skeleton-line h-2 w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
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
