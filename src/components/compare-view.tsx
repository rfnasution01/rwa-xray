"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  GitCompareArrows,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { type GlossaryTerm, TechnicalTerm } from "@/components/technical-term";
import {
  compareAssets,
  type CompareResponse,
  type ExplorerItem,
  type ExplorerResponse,
  getExplorer,
  RwaApiError,
} from "@/lib/rwa-api";

const comparisonLimit = 4;

export function CompareView() {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<number[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [positionValue, setPositionValue] = useState(100_000);
  const [participationRate, setParticipationRate] = useState(0.05);
  const [stressHaircut, setStressHaircut] = useState(0);
  const universe = useQuery({
    queryKey: ["compare-universe-all"],
    queryFn: loadCompareUniverse,
    refetchInterval: 60_000,
  });
  const suggested = useMemo(
    () => suggestPeers(universe.data?.items ?? []),
    [universe.data?.items],
  );
  const selectedIds = selected.length > 0 ? selected : suggested;
  const selectedCandidates = useMemo(
    () =>
      (universe.data?.items ?? []).filter((asset) =>
        selectedIds.includes(asset.rwaId),
      ),
    [selectedIds, universe.data?.items],
  );
  const visibleCandidates = useMemo(() => {
    const allCandidates = universe.data?.items ?? [];
    const needle = assetSearch.trim().toLowerCase();
    const unselected = allCandidates.filter(
      (asset) => !selectedIds.includes(asset.rwaId),
    );
    if (needle) {
      return unselected.filter(
        (asset) =>
          asset.name.toLowerCase().includes(needle) ||
          asset.symbol.toLowerCase().includes(needle),
      );
    }
    return unselected.slice(0, 15);
  }, [assetSearch, selectedIds, universe.data?.items]);
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
        : current.length < comparisonLimit
          ? [...current, rwaId]
          : current,
    );
    comparison.reset();
  }

  return (
    <section
      className="fx-compare-shell relative min-h-[calc(100vh-76px)] overflow-visible bg-[#02090b] text-[#e7f3f1]"
      data-processing={comparison.isPending ? "true" : undefined}
    >
      <div className="fx-explorer-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute top-[-18rem] right-0 size-[42rem] rounded-full bg-[#0b7373]/10 blur-[130px]" />

      <div className="relative mx-auto max-w-[1600px] px-5 py-10 sm:px-8 lg:px-14 lg:py-12">
        <motion.header
          className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.2, 0.75, 0.25, 1] }}
        >
          <div>
            <p className="fx-kicker">Shared scenario · 2–4 assets</p>
            <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] text-[#f0f7f5] sm:text-5xl lg:text-6xl">
              Compare <span className="fx-gradient-text">market capacity</span>
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#91acad] sm:text-base">
              Apply the same position, participation rate, and stress haircut to
              every asset. Results use neutral ordering by estimated exit days,
              not an investment recommendation.
            </p>
          </div>
        </motion.header>

        <motion.section
          className="mt-8 border border-[#1b6264] bg-[#031113]/94 shadow-[0_24px_80px_rgba(0,0,0,0.3)]"
          aria-labelledby="compare-select-assets"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{
            duration: 0.65,
            delay: reduceMotion ? 0 : 0.1,
            ease: [0.2, 0.75, 0.25, 1],
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[#153b3d] px-5 py-4 sm:items-center sm:px-6">
            <div>
              <h2
                id="compare-select-assets"
                className="text-lg font-medium tracking-tight text-[#e6f1ef]"
              >
                <TechnicalTerm term="assetSelection" />
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#719294]">
                Suggested peers favor the same asset category when available.
                Choose from all loaded candidates below.
              </p>
            </div>
            <span className="fx-data-badge shrink-0">
              {selectedIds.length}/{comparisonLimit} selected
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {universe.data ? (
              <label className="relative mb-4 block">
                <span className="sr-only">Search comparison candidates</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#4bc9c4]"
                  aria-hidden="true"
                />
                <input
                  className="fx-compare-search-input"
                  type="search"
                  value={assetSearch}
                  onChange={(event) => setAssetSearch(event.target.value)}
                  placeholder="Search all loaded assets by name or symbol"
                  aria-label="Search comparison candidates"
                />
              </label>
            ) : null}
            {universe.isLoading ? <SelectionSkeleton /> : null}
            {universe.error ? (
              <InlineError retry={() => void universe.refetch()} />
            ) : null}
            {universe.data ? (
              <>
                {selectedCandidates.length > 0 ? (
                  <div className="mb-5 border border-[#1d7778] bg-[#061b1d] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-mono text-[9px] font-semibold tracking-[0.14em] text-[#66ece5] uppercase">
                        Selected assets · {selectedCandidates.length}
                      </p>
                      <p className="font-mono text-[8px] text-[#527f81] uppercase">
                        Search-independent
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                      {selectedCandidates.map((asset, index) => (
                        <CompareAssetOption
                          key={`selected-${asset.rwaId}`}
                          asset={asset}
                          active
                          disabled={false}
                          index={index}
                          reduceMotion={Boolean(reduceMotion)}
                          onToggle={() => toggle(asset.rwaId)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[9px] tracking-[0.08em] text-[#527f81] uppercase">
                  <span>
                    Showing {visibleCandidates.length} of{" "}
                    {universe.data.items.length} loaded candidates
                    {assetSearch
                      ? " matching search"
                      : " (15 shown by default)"}
                  </span>
                  {assetSearch ? <span>Search active</span> : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {visibleCandidates.map((asset, index) => (
                    <CompareAssetOption
                      key={`candidate-${asset.rwaId}`}
                      asset={asset}
                      active={false}
                      disabled={selectedIds.length >= comparisonLimit}
                      index={index}
                      reduceMotion={Boolean(reduceMotion)}
                      onToggle={() => toggle(asset.rwaId)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </motion.section>

        <motion.section
          className="mt-4 border border-[#1b6264] bg-[#031113]/94"
          aria-labelledby="shared-scenario-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{
            duration: 0.65,
            delay: reduceMotion ? 0 : 0.18,
            ease: [0.2, 0.75, 0.25, 1],
          }}
        >
          <div className="border-b border-[#153b3d] px-5 py-4 sm:px-6">
            <h2
              id="shared-scenario-heading"
              className="text-lg font-medium tracking-tight"
            >
              <TechnicalTerm term="sharedScenario" />
            </h2>
            <p className="mt-1 text-xs text-[#719294]">
              Position, participation, and stress are applied to every selected
              asset.
            </p>
          </div>

          <div className="grid gap-px bg-[#153b3d] lg:grid-cols-[1.15fr_1fr_1fr_auto]">
            <label className="bg-[#041416] p-5">
              <span className="input-label">
                <TechnicalTerm term="positionValue" /> · USD
              </span>
              <span className="mt-3 flex items-center border border-[#245d60] bg-[#061719] focus-within:border-[#54e6df] focus-within:shadow-[0_0_0_3px_rgba(84,230,223,0.08)]">
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-[#e6f1ef] outline-none"
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
                <output className="border-l border-[#1b4c4e] px-3 font-mono text-xs text-[#6c9a9b]">
                  {formatMoney(positionValue)}
                </output>
              </span>
            </label>
            <div className="bg-[#041416] p-5">
              <CompareRange
                id="compare-participation"
                term="volumeParticipation"
                value={participationRate * 100}
                min={0.1}
                max={20}
                step={0.1}
                onChange={(value) => setParticipationRate(value / 100)}
              />
            </div>
            <div className="bg-[#041416] p-5">
              <CompareRange
                id="compare-haircut"
                term="stressHaircut"
                value={stressHaircut * 100}
                min={0}
                max={90}
                step={1}
                onChange={(value) => setStressHaircut(value / 100)}
              />
            </div>
            <div className="flex items-center bg-[#041416] p-5">
              <button
                className="fx-compare-action w-full lg:w-auto"
                type="button"
                disabled={
                  selectedIds.length < 2 ||
                  selectedIds.length > comparisonLimit ||
                  comparison.isPending
                }
                onClick={() => comparison.mutate()}
              >
                <GitCompareArrows className="size-4" aria-hidden="true" />
                {comparison.isPending
                  ? "Comparing real data…"
                  : "Run comparison"}
              </button>
            </div>
          </div>
        </motion.section>

        <AnimatePresence mode="wait">
          {comparison.error ? (
            <motion.div
              key="comparison-error"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            >
              <CompareError
                error={comparison.error}
                retry={() => comparison.mutate()}
              />
            </motion.div>
          ) : null}
          {comparison.data ? (
            <ComparisonResults
              key="comparison-results"
              data={comparison.data}
              requestedAssets={selectedCandidates}
              reduceMotion={Boolean(reduceMotion)}
            />
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {comparison.isPending ? (
          <ProcessingDialog
            assetCount={selectedIds.length}
            reduceMotion={Boolean(reduceMotion)}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function ProcessingDialog({
  assetCount,
  reduceMotion,
}: {
  assetCount: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[1200] grid place-items-center bg-[#010709]/78 px-5 backdrop-blur-[6px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-processing-title"
      aria-describedby="comparison-processing-description"
      aria-live="polite"
      tabIndex={-1}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="fx-processing-dialog relative w-full max-w-md overflow-hidden border border-[#32aaa8] bg-[#031214] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.62),0_0_40px_rgba(42,225,216,0.1)] sm:p-8"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.28, ease: [0.2, 0.75, 0.25, 1] }}
      >
        <div className="fx-processing-scan pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col items-center text-center">
          <div
            className="relative grid size-24 place-items-center"
            aria-hidden="true"
          >
            <motion.span
              className="absolute inset-0 rounded-full border border-[#17494b] border-t-[#5af1ea] border-r-[#2da8a6]"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
            />
            <motion.span
              className="absolute inset-3 rounded-full border border-[#173d3f] border-b-[#3bd8d2]"
              animate={reduceMotion ? undefined : { rotate: -360 }}
              transition={{ duration: 2.1, ease: "linear", repeat: Infinity }}
            />
            <GitCompareArrows className="size-6 text-[#6ef2eb]" />
          </div>

          <p className="fx-kicker mt-6">Scenario engine active</p>
          <h2
            id="comparison-processing-title"
            className="mt-3 text-2xl font-medium tracking-[-0.03em] text-[#eef8f6]"
          >
            Processing comparison
          </h2>
          <p
            id="comparison-processing-description"
            className="mt-3 max-w-xs text-sm leading-6 text-[#78999b]"
          >
            Applying one shared scenario across {assetCount} real-data asset
            {assetCount === 1 ? "" : "s"} and preserving unavailable evidence.
          </p>

          <div className="mt-6 flex items-center gap-2 font-mono text-[9px] tracking-[0.12em] text-[#67aaa8] uppercase">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="size-1.5 rounded-full bg-[#4ce8e1]"
                animate={
                  reduceMotion
                    ? undefined
                    : { opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }
                }
                transition={{
                  duration: 1.15,
                  delay: index * 0.16,
                  repeat: Infinity,
                }}
              />
            ))}
            Calculating capacity
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CompareAssetOption({
  asset,
  active,
  disabled,
  index,
  reduceMotion,
  onToggle,
}: {
  asset: ExplorerItem;
  active: boolean;
  disabled: boolean;
  index: number;
  reduceMotion: boolean;
  onToggle(): void;
}) {
  return (
    <motion.label
      className={
        active ? "fx-compare-asset fx-compare-asset-active" : "fx-compare-asset"
      }
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: disabled ? 0.58 : 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.25),
      }}
    >
      <input
        className="sr-only"
        type="checkbox"
        checked={active}
        disabled={disabled}
        onChange={onToggle}
      />
      <span
        className={
          active
            ? "fx-compare-check fx-compare-check-active"
            : "fx-compare-check"
        }
        aria-hidden="true"
      >
        {active ? <Check className="size-3.5" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#e7f1ef]">
          {asset.symbol}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#638688]">
          {asset.name}
        </span>
      </span>
      {active ? (
        <span className="fx-compare-selected-badge">Selected</span>
      ) : null}
    </motion.label>
  );
}

function ComparisonResults({
  data,
  requestedAssets,
  reduceMotion,
}: {
  data: CompareResponse;
  requestedAssets: ExplorerItem[];
  reduceMotion: boolean;
}) {
  return (
    <motion.section
      className="mt-4 border border-[#1b6264] bg-[#031113]/94"
      aria-labelledby="comparison-results"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.2, 0.75, 0.25, 1] }}
    >
      <div className="flex flex-col justify-between gap-3 border-b border-[#153b3d] px-5 py-4 sm:flex-row sm:items-end sm:px-6">
        <div>
          <p className="fx-kicker">
            <TechnicalTerm term="neutralOrdering" />
          </p>
          <h2
            id="comparison-results"
            className="mt-2 text-2xl font-medium tracking-[-0.025em]"
          >
            Scenario comparison
          </h2>
        </div>
        <p className="font-mono text-[10px] tracking-[0.04em] text-[#74999b]">
          {formatMoney(data.scenario.positionValue)} ·{" "}
          {formatPercent(data.scenario.participationRate)} participation ·{" "}
          {formatPercent(data.scenario.stressHaircut)} haircut
        </p>
      </div>

      <div className="px-4 pt-4 sm:px-5">
        {data.stale ? (
          <div className="fx-compare-warning">
            <AlertTriangle className="size-4 shrink-0" /> At least one result
            uses labeled stale real data.
          </div>
        ) : null}
        {data.failures.length > 0 ? (
          <div className="fx-compare-warning mt-3">
            <AlertTriangle className="size-4 shrink-0" />
            {data.failures.length} requested asset(s) could not be compared; the
            available results remain visible.
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
        {data.items.map((item, index) => (
          <motion.article
            key={item.asset.rwaId}
            className="border border-[#238386] bg-[#041719] p-5 shadow-[inset_0_0_35px_rgba(34,212,204,0.025)] sm:p-6"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: reduceMotion ? 0 : index * 0.07,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] tracking-[0.16em] text-[#56d9d4] uppercase">
                  Order {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-[#eef7f5]">
                  {item.asset.name}
                </h3>
                <p className="mt-1 font-mono text-[10px] text-[#6e9294]">
                  {item.asset.symbol}
                </p>
              </div>
              <span
                className={evidenceBadgeClass(
                  item.analysis.evidenceCoverage.label,
                )}
              >
                {item.analysis.evidenceCoverage.label}
              </span>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:items-center">
              <div>
                <span className="block text-5xl font-medium tracking-[-0.06em] text-[#edf8f6] tabular-nums sm:text-6xl">
                  {item.analysis.scenario.status === "available"
                    ? formatDays(item.analysis.scenario.estimatedExitDays)
                    : "—"}
                </span>
                <span className="mt-1 block font-mono text-[10px] tracking-[0.08em] text-[#729496] uppercase">
                  Estimated exit days
                </span>
              </div>
              <dl className="space-y-2 text-xs">
                <CompareMetric
                  term="dailyCapacity"
                  value={
                    item.analysis.scenario.status === "available"
                      ? formatMoney(item.analysis.scenario.dailyCapacity)
                      : "Unavailable"
                  }
                />
                <CompareMetric
                  term="turnoverRatio"
                  value={formatPercent(item.analysis.metrics.turnoverRatio)}
                />
                <CompareMetric
                  term="topMarketShare"
                  value={formatPercent(
                    item.analysis.concentration.market.top1Share,
                  )}
                />
                <CompareMetric
                  term="marketCapacityHealth"
                  value={
                    item.analysis.marketCapacityHealth.score === null
                      ? "Insufficient evidence"
                      : `${Math.round(item.analysis.marketCapacityHealth.score)}/100`
                  }
                />
                <CompareMetric
                  term="evidenceCoverage"
                  value={`${item.analysis.evidenceCoverage.score}/100`}
                />
              </dl>
            </div>

            {item.dataGaps.length > 0 ? (
              <p className="mt-5 flex gap-2 font-mono text-[9px] leading-5 text-[#e9b968]">
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {item.dataGaps.length}{" "}
                  <TechnicalTerm term="comparisonEvidenceGap" />
                  (s); unavailable metrics are not ranked as zero.
                </span>
              </p>
            ) : null}
            <Link
              className="mt-4 inline-flex items-center gap-2 border border-[#1f7779] bg-[#08292b] px-3 py-2 font-mono text-[9px] font-bold tracking-[0.08em] text-[#62e8e2] uppercase transition hover:border-[#5cece5] hover:text-[#c9fffc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55e9e2]"
              href={`/assets/${item.asset.rwaId}`}
            >
              Open Asset X-Ray <ArrowRight className="size-3.5" />
            </Link>
          </motion.article>
        ))}
        {data.failures.map((failure, index) => {
          const asset = requestedAssets.find(
            (candidate) => candidate.rwaId === failure.rwaId,
          );
          return (
            <motion.article
              key={`failure-${failure.rwaId}`}
              className="border border-[#72532b] bg-[#1a160d] p-5 sm:p-6"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: reduceMotion ? 0 : (data.items.length + index) * 0.07,
              }}
            >
              <p className="font-mono text-[9px] tracking-[0.16em] text-[#e9b968] uppercase">
                Comparison unavailable
              </p>
              <h3 className="mt-3 text-lg font-semibold text-[#f4ead6]">
                {asset?.name ?? `Asset ${failure.rwaId}`}
              </h3>
              <p className="mt-1 font-mono text-[10px] text-[#bda575]">
                {asset?.symbol ?? `RWA ID ${failure.rwaId}`}
              </p>
              <p className="mt-6 text-sm leading-6 text-[#d5c6a8]">
                This asset could not be analyzed because a required real-data
                source was unavailable. No synthetic values were substituted.
              </p>
              <p className="mt-4 font-mono text-[9px] tracking-[0.08em] text-[#aa8d5e] uppercase">
                {failure.code.replaceAll("_", " ")}
              </p>
            </motion.article>
          );
        })}
      </div>
      <p className="border-t border-[#153b3d] px-5 py-4 font-mono text-[9px] leading-5 tracking-[0.04em] text-[#557b7d] sm:px-6">
        Ordering is a scenario convenience, not a “best asset” ranking or
        investment recommendation. Reported volume is not order-book depth.
      </p>
    </motion.section>
  );
}

function CompareRange(props: {
  id: string;
  term: GlossaryTerm;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange(value: number): void;
}) {
  return (
    <label htmlFor={props.id}>
      <span className="flex items-center justify-between gap-3">
        <span className="input-label">
          <TechnicalTerm term={props.term} />
        </span>
        <output className="border border-[#245d60] bg-[#082123] px-3 py-2 font-mono text-[10px] text-[#d4efed]">
          {formatPercent(props.value / 100)}
        </output>
      </span>
      <input
        id={props.id}
        className="fx-range mt-5 w-full"
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

function CompareMetric({ term, value }: { term: GlossaryTerm; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#174143] pb-2 last:border-0">
      <dt className="text-[#719294]">
        <TechnicalTerm term={term} />
      </dt>
      <dd className="max-w-[55%] text-right font-semibold text-[#d8e7e5] tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function SelectionSkeleton() {
  return (
    <div
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
      aria-label="Loading comparison candidates"
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="fx-explorer-skeleton h-[58px] border border-[#153f41]"
        />
      ))}
      <span className="sr-only">Loading comparison candidates</span>
    </div>
  );
}

function InlineError({ retry }: { retry(): void }) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 border border-[#783d43] bg-[#211013] p-4 text-sm text-[#efb3b6] sm:flex-row sm:items-center">
      <span>Real asset candidates could not be loaded.</span>
      <button className="fx-compare-secondary" type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}

function CompareError({ error, retry }: { error: unknown; retry(): void }) {
  const rateLimited = error instanceof RwaApiError && error.status === 429;
  return (
    <div
      className="mt-4 border border-[#783d43] bg-[#211013] p-6 text-[#f1c4c6]"
      role="alert"
    >
      <AlertTriangle className="size-6 text-[#ef777d]" />
      <h2 className="mt-3 font-semibold text-[#ffe5e6]">
        {rateLimited
          ? "Comparison rate limit reached"
          : "Comparison unavailable"}
      </h2>
      <p className="mt-2 text-sm text-[#c99da0]">
        No synthetic comparison is substituted. Retry the real-data analysis.
      </p>
      <button
        className="fx-compare-secondary mt-4"
        type="button"
        onClick={retry}
      >
        <RefreshCw className="size-4" /> Retry
      </button>
    </div>
  );
}

function evidenceBadgeClass(label: "Limited" | "Moderate" | "High") {
  if (label === "High") return "fx-compare-badge fx-compare-badge-high";
  if (label === "Moderate") return "fx-compare-badge fx-compare-badge-moderate";
  return "fx-compare-badge fx-compare-badge-limited";
}

async function loadCompareUniverse(): Promise<ExplorerResponse> {
  const pageSize = 250;
  const pages: ExplorerResponse[] = [];
  let start = 1;

  while (true) {
    const page = await getExplorer({
      sort: "tokenized_volume_24h",
      sortDir: "desc",
      start,
      limit: pageSize,
    });
    pages.push(page);

    if (!page.pagination.hasMore || page.items.length === 0) break;
    start += page.items.length;
  }

  const firstPage = pages[0];
  if (!firstPage) {
    throw new Error("Comparison universe is empty");
  }

  const uniqueItems = Array.from(
    new Map(
      pages
        .flatMap((page) => page.items)
        .map((asset) => [asset.rwaId, asset] as const),
    ).values(),
  );

  return {
    ...firstPage,
    items: uniqueItems,
    pagination: {
      ...firstPage.pagination,
      hasMore: false,
      totalSize: firstPage.pagination.totalSize ?? uniqueItems.length,
    },
    stale: pages.some((page) => page.stale),
  };
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
  if (value === null) return "Unavailable";
  const absolute = Math.abs(value);
  const compact =
    absolute >= 1_000_000_000
      ? { divisor: 1_000_000_000, suffix: "B" }
      : absolute >= 1_000_000
        ? { divisor: 1_000_000, suffix: "M" }
        : absolute >= 1_000
          ? { divisor: 1_000, suffix: "K" }
          : { divisor: 1, suffix: "" };
  const amount = Number((value / compact.divisor).toFixed(2));
  return `$${amount}${compact.suffix}`;
}

function formatPercent(value: number | null) {
  return value === null
    ? "Unavailable"
    : `${Number((value * 100).toFixed(2))}%`;
}

function formatDays(value: number) {
  if (value < 0.1) return "<0.1";
  if (value >= 1_000) return ">999";
  return String(Number(value.toFixed(value < 10 ? 1 : 0)));
}
