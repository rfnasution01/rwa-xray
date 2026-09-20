"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ExternalLink,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Store,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import { CapacitySimulator } from "@/components/asset-detail/capacity-simulator";
import {
  DataPanel,
  EmptyDataPanel,
} from "@/components/asset-detail/data-panel";
import {
  formatCurrency,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  formatType,
  safeExternalUrl,
} from "@/components/asset-detail/formatters";
import { MarketsWorkspace } from "@/components/asset-detail/markets-workspace";
import { SmallMetric } from "@/components/asset-detail/small-metric";
import { TechnicalTerm, type GlossaryTerm } from "@/components/technical-term";
import { safeCmcImageUrl } from "@/lib/external-media";
import {
  type AssetDetailResponse,
  getAssetDetail,
  RwaApiError,
} from "@/lib/rwa-api";

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
        <EmptyDataPanel text="No source evidence returned." />
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
