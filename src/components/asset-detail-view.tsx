"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Store,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";

import { TechnicalTerm, type GlossaryTerm } from "@/components/technical-term";
import { calculateExitCapacity } from "@/domain/analysis/exit-capacity";
import { safeCmcImageUrl } from "@/lib/external-media";
import { formatPlanningHorizon } from "@/lib/utils";
import {
  type AssetDetailResponse,
  getAssetDetail,
  RwaApiError,
} from "@/lib/rwa-api";

const positions = [10_000, 100_000, 500_000, 1_000_000];
const detailTabs = [
  "overview",
  "simulator",
  "concentration",
  "markets",
  "evidence",
] as const;
type DetailTab = (typeof detailTabs)[number];

export function AssetDetailView({ rwaId }: { rwaId: number }) {
  const query = useQuery({
    queryKey: ["asset-detail", rwaId],
    queryFn: () => getAssetDetail(rwaId),
    refetchInterval: 60_000,
  });

  if (query.isLoading) return <DetailSkeleton />;
  if (query.error)
    return (
      <DetailError error={query.error} retry={() => void query.refetch()} />
    );
  if (!query.data) return null;

  return <DetailContent data={query.data} />;
}

function DetailContent({ data }: { data: AssetDetailResponse }) {
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const { asset, analysis, metadata, marketPairs } = data;
  const logoUrl = safeCmcImageUrl(metadata?.about?.logo ?? null);

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: DetailTab,
  ) {
    const currentIndex = detailTabs.indexOf(currentTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight")
      nextIndex = (currentIndex + 1) % detailTabs.length;
    if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + detailTabs.length) % detailTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = detailTabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = detailTabs[nextIndex];
    setActiveTab(nextTab);
    requestAnimationFrame(() =>
      document.getElementById(`asset-tab-${nextTab}`)?.focus(),
    );
  }
  return (
    <div className="fx-detail-shell relative min-h-[calc(100vh-76px)] overflow-visible bg-[#02090b] text-[#e6f1ef]">
      <div className="fx-explorer-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-14 lg:py-10">
        <Link
          className="inline-flex items-center gap-2 font-mono text-[9px] font-semibold tracking-[0.12em] text-[#59e8e1] uppercase transition hover:text-[#b2fffb] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#59e8e1]"
          href="/assets"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to Explorer
        </Link>

        <header className="relative mt-6 overflow-hidden border border-[#174f51] bg-[#041214]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-6 lg:flex lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden border border-[#3b9b99] bg-[#071a1c] font-mono text-sm font-bold tracking-wider text-[#73f4ed] shadow-[inset_0_0_24px_rgba(52,222,215,0.08),0_0_18px_rgba(52,222,215,0.07)]">
              {logoUrl ? (
                <Image
                  className="object-contain p-2"
                  src={logoUrl}
                  alt={`${asset.name} logo`}
                  fill
                  sizes="64px"
                />
              ) : (
                asset.symbol.slice(0, 4)
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-medium tracking-[-0.04em] text-[#f0f7f5] sm:text-4xl">
                  {asset.name}
                </h1>
                <span className="fx-data-badge">
                  {formatType(asset.assetType)}
                </span>
                {data.stale ? (
                  <span className="border border-[#8a642c] bg-[#241a0c] px-2 py-1 font-mono text-[8px] font-bold tracking-wider text-[#f2ca8e] uppercase">
                    Stale
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-mono text-[9px] tracking-[0.1em] text-[#608587] uppercase">
                {asset.symbol} · CMC RWA #{asset.rwaId}
                {metadata?.industry ? ` · ${metadata.industry}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-5 border border-[#1c5a5c] bg-[#061719] px-4 py-3 font-mono text-[9px] tracking-[0.08em] text-[#81a8a9] uppercase lg:mt-0">
            <span className="flex items-center gap-2">
              <span
                className="size-1.5 rounded-full bg-[#43e3a1] shadow-[0_0_9px_#43e3a1]"
                aria-hidden="true"
              />
              Updated {formatDateTime(analysis.calculatedAt)}
            </span>
            <span className="mt-1 block">
              Methodology {analysis.methodologyVersion}
            </span>
          </div>
        </header>

        {data.dataGaps.length > 0 ? (
          <DataGapBanner gaps={data.dataGaps} />
        ) : null}

        <div
          className="mt-7 flex overflow-x-auto border border-[#1a5557] bg-[#041214] p-1"
          role="tablist"
          aria-label="Asset analysis sections"
        >
          {detailTabs.map((tab) => (
            <button
              key={tab}
              id={`asset-tab-${tab}`}
              className={
                activeTab === tab
                  ? "fx-detail-tab fx-detail-tab-active"
                  : "fx-detail-tab"
              }
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`asset-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={(event) => handleTabKeyDown(event, tab)}
            >
              {formatType(tab)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "overview" ? (
            <motion.section
              key="overview"
              id="asset-panel-overview"
              className="pt-7"
              role="tabpanel"
              aria-labelledby="asset-tab-overview"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.2, 0.75, 0.25, 1] }}
            >
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <OverviewMetric
                  term="averageTokenizedPrice"
                  value={formatCurrency(asset.quote.averageTokenizedPrice)}
                />
                <OverviewMetric
                  term="tokenizedMarketCap"
                  align="right"
                  value={formatMoney(asset.quote.tokenizedMarketCap)}
                />
                <OverviewMetric
                  term="reportedVolume24h"
                  value={formatMoney(asset.quote.tokenizedVolume24h)}
                />
                <OverviewMetric
                  term="turnoverRatio"
                  align="right"
                  value={formatPercent(analysis.metrics.turnoverRatio)}
                />
              </dl>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <ScorePanel data={data} />
                <MetadataPanel data={data} />
              </div>
            </motion.section>
          ) : null}

          {activeTab === "simulator" ? (
            <motion.section
              key="simulator"
              id="asset-panel-simulator"
              className="pt-7"
              role="tabpanel"
              aria-labelledby="asset-tab-simulator"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.2, 0.75, 0.25, 1] }}
            >
              <SectionHeading
                eyebrow="Volume participation scenario"
                title="Exit Capacity Simulator"
                description="Adjust explicit assumptions without making another upstream request."
              />
              <CapacitySimulator volume24h={asset.quote.tokenizedVolume24h} />
            </motion.section>
          ) : null}

          {activeTab === "concentration" ? (
            <motion.section
              key="concentration"
              id="asset-panel-concentration"
              className="pt-7"
              role="tabpanel"
              aria-labelledby="asset-tab-concentration"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.2, 0.75, 0.25, 1] }}
            >
              <SectionHeading
                eyebrow="Observed distribution"
                title="Concentration X-Ray"
                description="Each dimension is calculated separately. Unavailable evidence is never converted to zero."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ConcentrationCard
                  icon={<Store />}
                  term="marketPairs"
                  label="Market pairs"
                  value={analysis.concentration.market}
                />
                <ConcentrationCard
                  icon={<Building2 />}
                  term="exchanges"
                  label="Exchanges"
                  value={analysis.concentration.exchange}
                />
                <ConcentrationCard
                  icon={<Layers3 />}
                  term="tokens"
                  label="Tokens"
                  value={analysis.concentration.token}
                />
                <ConcentrationCard
                  icon={<ShieldCheck />}
                  term="issuers"
                  label="Issuers"
                  value={analysis.concentration.issuer}
                  note={
                    analysis.concentration.issuerMappedVolumeCoverage === null
                      ? null
                      : `${formatPercent(analysis.concentration.issuerMappedVolumeCoverage)} mapped volume`
                  }
                />
              </div>
              <div className="mt-4 border border-[#1a5557] bg-[#041214] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">
                    <TechnicalTerm term="priceDispersion" />
                  </h3>
                  <span className="data-badge">
                    {analysis.priceDispersion.sampleSize} valid prices
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <SmallMetric
                    term="weightedMean"
                    value={formatCurrency(
                      analysis.priceDispersion.weightedMeanPrice,
                    )}
                  />
                  <SmallMetric
                    term="rawDeviation"
                    value={formatPercent(
                      analysis.priceDispersion.weightedAbsoluteDeviation,
                    )}
                  />
                  <SmallMetric
                    term="robustDeviation"
                    value={formatPercent(
                      analysis.priceDispersion.robustWeightedAbsoluteDeviation,
                    )}
                  />
                </dl>
              </div>
            </motion.section>
          ) : null}

          {activeTab === "markets" ? (
            <motion.section
              key="markets"
              id="asset-panel-markets"
              className="pt-7"
              role="tabpanel"
              aria-labelledby="asset-tab-markets"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.2, 0.75, 0.25, 1] }}
            >
              <SectionHeading
                eyebrow="Underlying observations"
                title="Tokens and markets"
                description="Token metrics, TradFi references, and market-pair observations are shown independently to avoid double counting."
              />
              <MarketsWorkspace
                tokens={asset.tokens}
                tradfiMarkets={asset.tradfiMarkets}
                marketPairs={marketPairs}
              />
            </motion.section>
          ) : null}

          {activeTab === "evidence" ? (
            <motion.section
              key="evidence"
              id="asset-panel-evidence"
              className="pt-7"
              role="tabpanel"
              aria-labelledby="asset-tab-evidence"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.2, 0.75, 0.25, 1] }}
            >
              <SectionHeading
                eyebrow="Traceable inputs"
                title="Evidence summary"
                description="Sanitized endpoint lineage and coverage factors. Credentials and raw headers are never exposed."
              />
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <EvidenceFactors data={data} />
                <SourceTable data={data} />
              </div>
              {analysis.warnings.length > 0 ? (
                <div className="mt-4 border border-[#7b582b] bg-[#1e170d] p-5">
                  <h3 className="font-semibold text-[#f3ce99]">
                    Methodology warnings
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-[#d8b77f]">
                    {analysis.warnings.map((warning) => (
                      <li
                        key={`${warning.code}:${warning.message}`}
                        className="flex gap-2"
                      >
                        <AlertTriangle
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          <strong>{warning.code.replaceAll("_", " ")}</strong> —{" "}
                          {warning.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </motion.section>
          ) : null}
        </AnimatePresence>

        <p className="mt-10 border-t border-[#153b3d] pt-5 font-mono text-[9px] leading-5 tracking-[0.06em] text-[#557b7d]">
          RWA X-Ray is a research tool, not investment advice. Capacity
          estimates do not model order-book depth, slippage, fees, redemption
          restrictions, market hours, or guaranteed execution.
        </p>
      </div>
    </div>
  );
}

function CapacitySimulator({ volume24h }: { volume24h: number | null }) {
  const [position, setPosition] = useState(100_000);
  const [participation, setParticipation] = useState(0.05);
  const [haircut, setHaircut] = useState(0);
  const result = useMemo(
    () =>
      calculateExitCapacity({
        positionValue: position,
        volume24h,
        participationRate: participation,
        stressHaircut: haircut,
      }),
    [haircut, participation, position, volume24h],
  );
  return (
    <div className="mt-5 overflow-hidden border border-[#1a5557] bg-[#030f11] shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-[#153b3d] bg-[#041416] p-5 sm:p-6 lg:border-r">
          <label className="input-label" htmlFor="position-value">
            Position value · USD
          </label>
          <input
            id="position-value"
            className="control-input mt-2"
            type="number"
            min="1"
            value={position}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (Number.isFinite(value) && value > 0) setPosition(value);
            }}
          />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {positions.map((value) => (
              <button
                key={value}
                className={
                  position === value
                    ? "preset-button preset-button-active"
                    : "preset-button"
                }
                type="button"
                onClick={() => setPosition(value)}
              >
                {formatMoney(value)}
              </button>
            ))}
          </div>
          <RangeControl
            id="participation-rate"
            term="volumeParticipation"
            value={participation * 100}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(value) => setParticipation(value / 100)}
          />
          <RangeControl
            id="stress-haircut"
            term="stressHaircut"
            value={haircut * 100}
            min={0}
            max={90}
            step={1}
            onChange={(value) => setHaircut(value / 100)}
          />
        </div>
        <div className="bg-[#030e10] p-5 sm:p-7">
          {result.status === "available" ? (
            <>
              <p className="fx-kicker">Estimated capacity</p>
              <div className="mt-4 flex items-end gap-3">
                <strong className="fx-result-value text-5xl font-medium tracking-[-0.05em] tabular-nums">
                  {formatDays(result.estimatedExitDays)}
                </strong>
                <span className="pb-1 font-mono text-[10px] tracking-wider text-[#628789] uppercase">
                  days
                </span>
              </div>
              <div className="mt-4 inline-flex flex-wrap items-center gap-2 border border-[#1c5557] bg-[#061719] px-3 py-2">
                <span className="font-mono text-[9px] tracking-[0.08em] text-[#6c9293] uppercase">
                  <TechnicalTerm term="planningHorizon" />
                </span>
                <strong className="font-mono text-xs text-[#69ebe5]">
                  {formatPlanningHorizon(result.planningHorizon)}
                </strong>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                <SmallMetric
                  term="effectiveVolume"
                  value={formatMoney(result.effectiveVolume)}
                />
                <SmallMetric
                  term="dailyExitCapacity"
                  value={formatMoney(result.dailyCapacity)}
                />
                <SmallMetric
                  term="positionToVolume"
                  value={formatPercent(result.positionToVolumeRatio)}
                />
              </dl>
            </>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div>
                <AlertTriangle className="mx-auto size-6 text-amber-500" />
                <h3 className="mt-3 font-semibold">No observed capacity</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Aggregate volume is missing or zero.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RangeControl(props: {
  id: string;
  term: GlossaryTerm;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange(value: number): void;
}) {
  return (
    <label className="mt-5 block" htmlFor={props.id}>
      <span className="flex justify-between text-xs font-semibold">
        <TechnicalTerm term={props.term} />
        <output>{formatPercent(props.value / 100)}</output>
      </span>
      <input
        id={props.id}
        className="fx-range mt-3 w-full"
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

function ScorePanel({ data }: { data: AssetDetailResponse }) {
  const { evidenceCoverage, marketCapacityHealth } = data.analysis;
  return (
    <article className="border border-[#1a5557] bg-[#041214] p-5">
      <p className="fx-kicker">Quality at a glance</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Score
          value={marketCapacityHealth.score}
          term="marketCapacityHealth"
          label="Market Capacity Health"
          sublabel={`${Math.round(marketCapacityHealth.coverage * 100)}% component coverage`}
        />
        <Score
          value={evidenceCoverage.score}
          term="evidenceCoverage"
          label="Evidence Coverage"
          align="right"
          sublabel={evidenceCoverage.label}
        />
      </div>
    </article>
  );
}

function Score({
  value,
  term,
  label,
  align = "left",
  sublabel,
}: {
  value: number | null;
  term: GlossaryTerm;
  label: string;
  align?: "left" | "right";
  sublabel: string;
}) {
  const score = value === null ? 0 : Math.round(value);
  return (
    <div className="flex flex-col items-center border border-[#153f41] bg-[#061719] p-4 text-center">
      <div
        className="grid size-24 place-items-center rounded-full p-[7px]"
        style={{
          background: `conic-gradient(#56ebe4 ${score * 3.6}deg, #163638 0deg)`,
        }}
        aria-label={`${label}: ${value === null ? "unavailable" : `${score} out of 100`}`}
      >
        <div className="grid size-full place-items-center rounded-full bg-[#061416] shadow-[inset_0_0_18px_rgba(0,0,0,0.55)]">
          <span>
            <strong className="block text-2xl font-medium text-[#65eee7] tabular-nums">
              {value === null ? "—" : score}
            </strong>
            <span className="font-mono text-[8px] text-[#739799]">/100</span>
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#c8d9d7]">
        <TechnicalTerm term={term} align={align}>
          {label}
        </TechnicalTerm>
      </p>
      <p className="mt-1 font-mono text-[9px] text-[#739799]">{sublabel}</p>
    </div>
  );
}

function MetadataPanel({ data }: { data: AssetDetailResponse }) {
  const metadata = data.metadata;
  const website = safeExternalUrl(
    metadata?.website ?? metadata?.about?.website ?? null,
  );
  const suppliedLogo = safeExternalUrl(metadata?.about?.logo ?? null);
  const cikHref =
    metadata?.cik && /^\d{1,10}$/.test(metadata.cik)
      ? `https://www.sec.gov/edgar/browse/?CIK=${encodeURIComponent(metadata.cik)}`
      : null;
  const tokenizationStatus =
    data.asset.hasTokens === true
      ? "Token records available"
      : data.asset.hasTokens === false
        ? "No token records reported"
        : "Unavailable";

  return (
    <article className="border border-[#1a5557] bg-[#041214] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="fx-kicker">Asset context</p>
        <div className="flex flex-wrap gap-2">
          {website ? (
            <a
              className="inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.08em] text-[#5ee9e2] uppercase hover:text-[#c3fffc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55e9e2]"
              href={website}
              target="_blank"
              rel="noreferrer"
            >
              Asset website <ExternalLink className="size-3" />
            </a>
          ) : null}
          {suppliedLogo ? (
            <a
              className="inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.08em] text-[#5ee9e2] uppercase hover:text-[#c3fffc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55e9e2]"
              href={suppliedLogo}
              target="_blank"
              rel="noreferrer"
            >
              Logo source <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#89a6a7]">
        {metadata?.about?.description ??
          "CMC metadata description is unavailable for this asset."}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <SmallMetric
          term="primaryExchange"
          value={metadata?.primaryExchange ?? "Unavailable"}
        />
        <SmallMetric
          term="founded"
          align="right"
          value={metadata?.founded ?? "Unavailable"}
        />
        <SmallMetric
          term="employeeCount"
          value={
            metadata?.employees === null || metadata?.employees === undefined
              ? "Unavailable"
              : new Intl.NumberFormat("en-US", {
                  maximumFractionDigits: 0,
                }).format(metadata.employees)
          }
        />
        <SmallMetric
          term="cik"
          align="right"
          value={
            cikHref ? (
              <a
                className="inline-flex items-center gap-1.5 text-[#5ee9e2] hover:text-[#c3fffc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55e9e2]"
                href={cikHref}
                target="_blank"
                rel="noreferrer"
              >
                {metadata?.cik} <ExternalLink className="size-3" />
              </a>
            ) : (
              (metadata?.cik ?? "Unavailable")
            )
          }
        />
        <SmallMetric
          term="metadataDateAdded"
          value={
            metadata?.about?.dateAdded
              ? formatDateTime(metadata.about.dateAdded)
              : "Unavailable"
          }
        />
        <SmallMetric
          term="tokenizationStatus"
          align="right"
          value={tokenizationStatus}
        />
        <SmallMetric
          term="firstHistoricalData"
          value={
            data.historyCoverage?.firstHistoricalData
              ? formatDateTime(data.historyCoverage.firstHistoricalData)
              : "Unavailable"
          }
        />
        <SmallMetric
          term="lastHistoricalData"
          align="right"
          value={
            data.historyCoverage?.lastHistoricalData
              ? formatDateTime(data.historyCoverage.lastHistoricalData)
              : "Unavailable"
          }
        />
      </dl>
    </article>
  );
}

function ConcentrationCard({
  icon,
  term,
  label,
  value,
  note,
}: {
  icon: React.ReactElement;
  term: GlossaryTerm;
  label: string;
  value: AssetDetailResponse["analysis"]["concentration"]["market"];
  note?: string | null;
}) {
  return (
    <article className="border border-[#1a5557] bg-[#041214] p-5">
      <div className="flex items-center justify-between">
        <span className="text-[#59e8e1] [&>svg]:size-5">{icon}</span>
        <span className="data-badge">n={value.sampleSize}</span>
      </div>
      <h3 className="mt-4 font-semibold">
        <TechnicalTerm term={term}>{label}</TechnicalTerm>
      </h3>
      {value.status === "available" ? (
        <dl className="mt-4 grid grid-cols-2 gap-2">
          <SmallMetric term="topShare" value={formatPercent(value.top1Share)} />
          <SmallMetric
            term="normalizedHhi"
            value={formatNumber(value.normalizedHhi)}
          />
        </dl>
      ) : (
        <p className="mt-4 text-sm text-[#678b8d]">
          Insufficient observed volume.
        </p>
      )}
      {note ? <p className="mt-3 text-xs text-[#678b8d]">{note}</p> : null}
    </article>
  );
}

const marketViews = ["tokens", "tradfi", "pairs"] as const;
type MarketView = (typeof marketViews)[number];
type SortDirection = "asc" | "desc";
type SortValue = number | string | null;
const tablePageSize = 10;

function MarketsWorkspace({
  tokens,
  tradfiMarkets,
  marketPairs,
}: {
  tokens: AssetDetailResponse["asset"]["tokens"];
  tradfiMarkets: AssetDetailResponse["asset"]["tradfiMarkets"];
  marketPairs: AssetDetailResponse["marketPairs"];
}) {
  const [activeView, setActiveView] = useState<MarketView>("tokens");
  const pairCount = marketPairs?.pairs.length ?? 0;
  const tabs: Array<{
    id: MarketView;
    label: string;
    description: string;
    count: number;
    icon: React.ReactElement;
  }> = [
    {
      id: "tokens",
      label: "Underlying tokens",
      description: "Token-level price, issuer, and observed volume.",
      count: tokens.length,
      icon: <Layers3 />,
    },
    {
      id: "tradfi",
      label: "TradFi markets",
      description: "Reported traditional-market references.",
      count: tradfiMarkets.length,
      icon: <Building2 />,
    },
    {
      id: "pairs",
      label: "Market pairs",
      description: "Complete validated market-pair observations.",
      count: pairCount,
      icon: <Store />,
    },
  ];

  function handleViewKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentView: MarketView,
  ) {
    const currentIndex = marketViews.indexOf(currentView);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown")
      nextIndex = (currentIndex + 1) % marketViews.length;
    if (event.key === "ArrowUp")
      nextIndex = (currentIndex - 1 + marketViews.length) % marketViews.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = marketViews.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextView = marketViews[nextIndex];
    setActiveView(nextView);
    requestAnimationFrame(() =>
      document.getElementById(`market-view-${nextView}`)?.focus(),
    );
  }

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
      <div
        className="grid h-fit content-start gap-2 border border-[#1a5557] bg-[#041214] p-2"
        role="tablist"
        aria-label="Market datasets"
        aria-orientation="vertical"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`market-view-${tab.id}`}
            className={
              activeView === tab.id
                ? "border border-[#3bcfc9] bg-[#0a292b] p-3 text-left text-[#dffbf8] shadow-[inset_3px_0_0_#55eee7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55eee7]"
                : "border border-transparent p-3 text-left text-[#8ca9aa] transition hover:border-[#215d5f] hover:bg-[#071b1d] hover:text-[#d2e4e2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55eee7]"
            }
            type="button"
            role="tab"
            aria-selected={activeView === tab.id}
            aria-controls={`market-panel-${tab.id}`}
            tabIndex={activeView === tab.id ? 0 : -1}
            onClick={() => setActiveView(tab.id)}
            onKeyDown={(event) => handleViewKeyDown(event, tab.id)}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold [&>svg]:size-4">
                {tab.icon}
                {tab.label}
              </span>
              <span className="data-badge">{tab.count}</span>
            </span>
            <span className="mt-2 block text-xs leading-5 text-[#6f9294]">
              {tab.description}
            </span>
          </button>
        ))}
      </div>

      <div
        id={`market-panel-${activeView}`}
        role="tabpanel"
        aria-labelledby={`market-view-${activeView}`}
        tabIndex={0}
        className="min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55eee7]"
      >
        {activeView === "tokens" ? <TokenTable tokens={tokens} /> : null}
        {activeView === "tradfi" ? (
          <TradfiMarketTable markets={tradfiMarkets} />
        ) : null}
        {activeView === "pairs" ? (
          <MarketTable marketPairs={marketPairs} />
        ) : null}
      </div>
    </div>
  );
}

function TokenTable({
  tokens,
}: {
  tokens: AssetDetailResponse["asset"]["tokens"];
}) {
  type TokenSortKey = "token" | "issuer" | "price" | "volume";
  const table = useSortableTable<
    AssetDetailResponse["asset"]["tokens"][number],
    TokenSortKey
  >(tokens, "token", (token, key): SortValue => {
    if (key === "token") return `${token.symbol} ${token.name}`;
    if (key === "issuer") return token.issuerName;
    if (key === "price") return token.price;
    return token.volume24h;
  });
  return (
    <DataPanel title="Underlying tokens" count={tokens.length}>
      {tokens.length === 0 ? (
        <EmptyRow text="No underlying token breakdown returned." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="table-head">
                <tr>
                  <SortableHeader label="Token" column="token" table={table} />
                  <SortableHeader
                    label="Issuer"
                    column="issuer"
                    table={table}
                  />
                  <SortableHeader
                    label="Price"
                    column="price"
                    table={table}
                    align="right"
                  />
                  <SortableHeader
                    label="24h volume"
                    column="volume"
                    table={table}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="table-body">
                {table.visibleRows.map((token) => (
                  <tr key={token.cryptoId}>
                    <td>
                      <strong>{token.symbol}</strong>
                      <span className="block text-xs text-slate-400">
                        {token.name}
                      </span>
                    </td>
                    <td>
                      {token.issuerName && issuerHref(token.issuerId) ? (
                        <Link
                          className="text-[#5ee9e2] hover:text-[#c3fffc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55e9e2]"
                          href={issuerHref(token.issuerId)!}
                        >
                          {token.issuerName}
                        </Link>
                      ) : (
                        (token.issuerName ?? "Unmapped")
                      )}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatCurrency(token.price)}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatMoney(token.volume24h)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination table={table} label="underlying tokens" />
        </>
      )}
    </DataPanel>
  );
}

function TradfiMarketTable({
  markets,
}: {
  markets: AssetDetailResponse["asset"]["tradfiMarkets"];
}) {
  type TradfiSortKey = "exchange" | "ticker" | "reference";
  const table = useSortableTable<
    AssetDetailResponse["asset"]["tradfiMarkets"][number],
    TradfiSortKey
  >(markets, "exchange", (market, key): SortValue => {
    if (key === "exchange") return market.exchangeName;
    if (key === "ticker") return market.ticker;
    return market.marketUrl;
  });
  return (
    <DataPanel title="TradFi markets" count={markets.length}>
      {markets.length === 0 ? (
        <EmptyRow text="No TradFi market references were returned." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="table-head">
                <tr>
                  <SortableHeader
                    label="Exchange"
                    column="exchange"
                    table={table}
                  />
                  <SortableHeader
                    label="Ticker"
                    column="ticker"
                    table={table}
                  />
                  <SortableHeader
                    label="Reference"
                    column="reference"
                    table={table}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="table-body">
                {table.visibleRows.map((market) => {
                  const marketUrl = safeExternalUrl(market.marketUrl);
                  return (
                    <tr key={`${market.exchangeId}-${market.ticker}`}>
                      <td>
                        <strong>{market.exchangeName}</strong>
                        <span className="block text-xs text-slate-400">
                          {market.exchangeSlug}
                        </span>
                      </td>
                      <td className="font-mono font-semibold">
                        {market.ticker}
                      </td>
                      <td className="text-right">
                        {marketUrl ? (
                          <a
                            className="inline-flex items-center gap-1 text-[#5ee9e2] transition hover:text-[#c3fffc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55e9e2]"
                            href={marketUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open market
                            <ExternalLink
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </a>
                        ) : (
                          <span className="text-[#678b8d]">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination table={table} label="TradFi markets" />
        </>
      )}
    </DataPanel>
  );
}

function MarketTable({
  marketPairs,
}: {
  marketPairs: AssetDetailResponse["marketPairs"];
}) {
  type PairSortKey = "pair" | "exchange" | "price" | "volume";
  const pairs = marketPairs?.pairs ?? [];
  const table = useSortableTable<
    NonNullable<AssetDetailResponse["marketPairs"]>["pairs"][number],
    PairSortKey
  >(
    pairs,
    "volume",
    (pair, key): SortValue => {
      if (key === "pair") return pair.marketPair;
      if (key === "exchange") return pair.exchange.name;
      if (key === "price") return pair.marketQuote.price;
      return pair.marketQuote.volume24h;
    },
    "desc",
  );
  return (
    <DataPanel title="Market pairs" count={pairs.length}>
      {pairs.length === 0 ? (
        <EmptyRow text="Market-pair evidence is unavailable." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="table-head">
                <tr>
                  <SortableHeader label="Pair" column="pair" table={table} />
                  <SortableHeader
                    label="Exchange"
                    column="exchange"
                    table={table}
                  />
                  <SortableHeader
                    label="Price"
                    column="price"
                    table={table}
                    align="right"
                  />
                  <SortableHeader
                    label="24h volume"
                    column="volume"
                    table={table}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="table-body">
                {table.visibleRows.map((pair, index) => (
                  <tr
                    key={`${pair.marketId}-${pair.exchange.id}-${pair.base.cryptoId ?? "base"}-${pair.quote.cryptoId ?? "quote"}-${table.startIndex + index}`}
                  >
                    <td className="font-semibold">{pair.marketPair}</td>
                    <td>{pair.exchange.name}</td>
                    <td className="text-right tabular-nums">
                      {formatCurrency(pair.marketQuote.price)}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatMoney(pair.marketQuote.volume24h)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination table={table} label="market pairs" />
        </>
      )}
    </DataPanel>
  );
}

function useSortableTable<T, TKey extends string>(
  rows: T[],
  initialKey: TKey,
  getValue: (row: T, key: TKey) => SortValue,
  initialDirection: SortDirection = "asc",
) {
  const [sort, setSort] = useState({
    key: initialKey,
    direction: initialDirection,
  });
  const [page, setPage] = useState(1);
  const sortedRows = rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const comparison = compareSortValues(
        getValue(left.row, sort.key),
        getValue(right.row, sort.key),
        sort.direction,
      );
      return comparison === 0 ? left.index - right.index : comparison;
    })
    .map(({ row }) => row);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / tablePageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * tablePageSize;

  function requestSort(key: TKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  return {
    currentPage,
    endIndex: Math.min(startIndex + tablePageSize, sortedRows.length),
    pageCount,
    requestSort,
    setPage,
    sort,
    startIndex,
    totalRows: sortedRows.length,
    visibleRows: sortedRows.slice(startIndex, startIndex + tablePageSize),
  };
}

type SortableTableState<TKey extends string> = ReturnType<
  typeof useSortableTable<unknown, TKey>
>;

function SortableHeader<TKey extends string>({
  label,
  column,
  table,
  align = "left",
}: {
  label: string;
  column: TKey;
  table: SortableTableState<TKey>;
  align?: "left" | "right";
}) {
  const active = table.sort.key === column;
  const ariaSort = active
    ? table.sort.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";
  return (
    <th
      className={align === "right" ? "text-right" : undefined}
      aria-sort={ariaSort}
    >
      <button
        className={`inline-flex min-h-10 items-center gap-1.5 text-left transition hover:text-[#b8fffb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55eee7] ${align === "right" ? "ml-auto" : ""}`}
        type="button"
        aria-label={
          active
            ? `Sort by ${label}, currently ${table.sort.direction === "asc" ? "ascending" : "descending"}`
            : `Sort by ${label}`
        }
        onClick={() => table.requestSort(column)}
      >
        {label}
        {active ? (
          table.sort.direction === "asc" ? (
            <ArrowUp className="size-3.5" aria-hidden="true" />
          ) : (
            <ArrowDown className="size-3.5" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-[#608587]" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}

function TablePagination<TKey extends string>({
  table,
  label,
}: {
  table: SortableTableState<TKey>;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#153b3d] bg-[#031012] px-4 py-3">
      <p
        className="font-mono text-[9px] tracking-[0.06em] text-[#719395] uppercase"
        aria-live="polite"
      >
        Showing {table.startIndex + 1}–{table.endIndex} of {table.totalRows}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="grid size-9 place-items-center border border-[#285f61] text-[#8bc4c2] transition hover:border-[#55e8e1] hover:text-[#dffffb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55eee7] disabled:cursor-not-allowed disabled:opacity-35"
          type="button"
          aria-label={`Previous page of ${label}`}
          disabled={table.currentPage === 1}
          onClick={() => table.setPage(table.currentPage - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="min-w-24 text-center font-mono text-[10px] text-[#a9c5c4]">
          Page {table.currentPage} of {table.pageCount}
        </span>
        <button
          className="grid size-9 place-items-center border border-[#285f61] text-[#8bc4c2] transition hover:border-[#55e8e1] hover:text-[#dffffb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55eee7] disabled:cursor-not-allowed disabled:opacity-35"
          type="button"
          aria-label={`Next page of ${label}`}
          disabled={table.currentPage === table.pageCount}
          onClick={() => table.setPage(table.currentPage + 1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function compareSortValues(
  left: SortValue,
  right: SortValue,
  direction: SortDirection,
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const comparison =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), "en", {
          numeric: true,
          sensitivity: "base",
        });
  return direction === "asc" ? comparison : -comparison;
}

function EvidenceFactors({ data }: { data: AssetDetailResponse }) {
  return (
    <article className="border border-[#1a5557] bg-[#041214] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          <TechnicalTerm term="coverageFactors" />
        </h3>
        <span className="font-semibold tabular-nums">
          {data.analysis.evidenceCoverage.score}/100
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {data.analysis.evidenceCoverage.factors.map((factor) => (
          <li key={factor.key}>
            <div className="flex justify-between text-xs">
              <span className="capitalize">
                {factor.key.replaceAll(/([A-Z])/g, " $1")}
              </span>
              <span>
                {factor.earned}/{factor.weight}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden bg-[#112f31]">
              <div
                className="h-full bg-[#51e8e1] shadow-[0_0_8px_rgba(81,232,225,0.35)]"
                style={{
                  width: `${factor.weight > 0 ? (factor.earned / factor.weight) * 100 : 0}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function SourceTable({ data }: { data: AssetDetailResponse }) {
  return (
    <DataPanel
      title="Sanitized source lineage"
      term="sourceLineage"
      count={data.sourceStatuses.length}
    >
      {data.sourceStatuses.length === 0 ? (
        <EmptyRow text="No source evidence returned." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th>Dataset</th>
                <th>Endpoint</th>
                <th>Cache</th>
                <th>Observed</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {data.sourceStatuses.map((source) => (
                <tr key={`${source.source}:${source.evidence.endpoint}`}>
                  <td className="font-semibold capitalize">{source.source}</td>
                  <td className="font-mono text-xs">
                    {source.evidence.endpoint}
                  </td>
                  <td className="capitalize">{source.cache.state}</td>
                  <td>{formatDateTime(source.evidence.observedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  );
}

function DataGapBanner({ gaps }: { gaps: AssetDetailResponse["dataGaps"] }) {
  return (
    <div className="status-banner status-banner-warning mt-6">
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <p>
        <strong>Partial evidence:</strong>{" "}
        {gaps
          .map(
            (gap) =>
              `${gap.source} (${gap.code.toLowerCase().replaceAll("_", " ")})`,
          )
          .join(", ")}
        . Unavailable metrics remain blank.
      </p>
    </div>
  );
}

function DataPanel({
  title,
  term,
  count,
  children,
}: {
  title: string;
  term?: GlossaryTerm;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <article className="overflow-hidden border border-[#1a5557] bg-[#041214]">
      <div className="flex items-center justify-between border-b border-[#153b3d] px-5 py-4">
        <h3 className="font-semibold">
          {term ? <TechnicalTerm term={term}>{title}</TechnicalTerm> : title}
        </h3>
        <span className="data-badge">{count} records</span>
      </div>
      {children}
    </article>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm text-[#678b8d]">
      <Database
        className="mx-auto mb-3 size-5 text-[#56dcd6]"
        aria-hidden="true"
      />
      {text}
    </div>
  );
}
function OverviewMetric({
  term,
  value,
  align = "left",
}: {
  term: GlossaryTerm;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div className="border border-[#1a5557] bg-[#041416] p-5 shadow-[inset_0_0_24px_rgba(45,202,196,0.025)]">
      <dt className="font-mono text-[9px] tracking-[0.08em] text-[#739799] uppercase">
        <TechnicalTerm term={term} align={align} />
      </dt>
      <dd className="mt-3 text-xl font-medium tracking-tight text-[#dff0ee] tabular-nums">
        {value}
      </dd>
    </div>
  );
}
function SmallMetric({
  term,
  value,
  align = "left",
}: {
  term: GlossaryTerm;
  value: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="border border-[#153f41] bg-[#061719] p-3">
      <dt className="font-mono text-[9px] text-[#739799]">
        <TechnicalTerm term={term} align={align} />
      </dt>
      <dd className="mt-2 text-sm font-medium text-[#cfdfdd] tabular-nums">
        {value}
      </dd>
    </div>
  );
}
function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="fx-kicker">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-medium tracking-[-0.025em] text-[#eaf4f2]">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#78999b]">
        {description}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#02090b]">
      <div
        className="mx-auto max-w-[1600px] space-y-5 px-5 py-10 sm:px-8 lg:px-14"
        aria-label="Loading asset X-Ray"
      >
        <div className="fx-skeleton h-28 p-6">
          <div className="flex items-center gap-4">
            <div className="fx-skeleton-cell size-16" />
            <div className="w-full max-w-md space-y-3">
              <div className="fx-skeleton-line h-5 w-3/5" />
              <div className="fx-skeleton-line h-2.5 w-2/5" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-px border border-[#174749] bg-[#143638] p-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 bg-[#061416]" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="fx-skeleton-cell h-28" />
          ))}
        </div>
        <div className="fx-skeleton-cell h-72" />
        <span className="sr-only">Loading asset X-Ray</span>
      </div>
    </div>
  );
}

function DetailError({ error, retry }: { error: unknown; retry(): void }) {
  const notFound = error instanceof RwaApiError && error.status === 404;
  return (
    <div className="grid min-h-[calc(100vh-76px)] place-items-center bg-[#02090b] px-6 text-center">
      <div>
        <AlertTriangle
          className="mx-auto size-8 text-rose-500"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-2xl font-semibold">
          {notFound ? "RWA asset not found" : "Asset X-Ray unavailable"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          No synthetic detail is substituted. Check the identifier or retry the
          real data request.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className="button-secondary" href="/assets">
            Explorer
          </Link>
          {notFound ? null : (
            <button className="button-primary" type="button" onClick={retry}>
              <RefreshCw className="size-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
function formatCurrency(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: value < 1 ? 4 : 2,
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
function formatNumber(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(
        value,
      );
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
function issuerHref(issuerId: string | null) {
  return issuerId && /^[0-9a-f]{24}$/.test(issuerId)
    ? `/issuers/${issuerId}`
    : null;
}

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function formatType(value: string) {
  return value.replaceAll("_", " ");
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
