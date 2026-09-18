"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Database,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { calculateExitCapacity } from "@/domain/analysis/exit-capacity";
import {
  type AssetDetailResponse,
  getAssetDetail,
  RwaApiError,
} from "@/lib/rwa-api";

const positions = [10_000, 100_000, 500_000, 1_000_000];

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
  const { asset, analysis, metadata, marketPairs } = data;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        href="/assets"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to Explorer
      </Link>

      <header className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div className="flex items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-slate-950 font-mono text-sm font-bold text-white dark:bg-white dark:text-slate-950">
            {asset.symbol.slice(0, 4)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {asset.name}
              </h1>
              <span className="data-badge">{formatType(asset.assetType)}</span>
              {data.stale ? (
                <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 uppercase dark:bg-amber-950 dark:text-amber-200">
                  Stale
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {asset.symbol} · CMC RWA #{asset.rwaId}
              {metadata?.industry ? ` · ${metadata.industry}` : ""}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <span className="flex items-center gap-2">
            <span
              className="size-2 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            Updated {formatDateTime(analysis.calculatedAt)}
          </span>
          <span className="mt-1 block">
            Methodology {analysis.methodologyVersion}
          </span>
        </div>
      </header>

      {data.dataGaps.length > 0 ? <DataGapBanner gaps={data.dataGaps} /> : null}

      <nav
        className="mt-7 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 text-sm dark:border-slate-800 dark:bg-slate-900"
        aria-label="Asset analysis sections"
      >
        {["Overview", "Simulator", "Concentration", "Markets", "Evidence"].map(
          (label) => (
            <a
              key={label}
              className="nav-link whitespace-nowrap"
              href={`#${label.toLowerCase()}`}
            >
              {label}
            </a>
          ),
        )}
      </nav>

      <section id="overview" className="scroll-mt-4 pt-7">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewMetric
            label="Average tokenized price"
            value={formatCurrency(asset.quote.averageTokenizedPrice)}
          />
          <OverviewMetric
            label="Tokenized market cap"
            value={formatMoney(asset.quote.tokenizedMarketCap)}
          />
          <OverviewMetric
            label="Reported volume · 24h"
            value={formatMoney(asset.quote.tokenizedVolume24h)}
          />
          <OverviewMetric
            label="Turnover ratio"
            value={formatPercent(analysis.metrics.turnoverRatio)}
          />
        </dl>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ScorePanel data={data} />
          <MetadataPanel data={data} />
        </div>
      </section>

      <section id="simulator" className="scroll-mt-4 pt-10">
        <SectionHeading
          eyebrow="Volume participation scenario"
          title="Exit Capacity Simulator"
          description="Adjust explicit assumptions without making another upstream request."
        />
        <CapacitySimulator volume24h={asset.quote.tokenizedVolume24h} />
      </section>

      <section id="concentration" className="scroll-mt-4 pt-10">
        <SectionHeading
          eyebrow="Observed distribution"
          title="Concentration X-Ray"
          description="Each dimension is calculated separately. Unavailable evidence is never converted to zero."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ConcentrationCard
            icon={<Store />}
            label="Market pairs"
            value={analysis.concentration.market}
          />
          <ConcentrationCard
            icon={<Building2 />}
            label="Exchanges"
            value={analysis.concentration.exchange}
          />
          <ConcentrationCard
            icon={<Layers3 />}
            label="Tokens"
            value={analysis.concentration.token}
          />
          <ConcentrationCard
            icon={<ShieldCheck />}
            label="Issuers"
            value={analysis.concentration.issuer}
            note={
              analysis.concentration.issuerMappedVolumeCoverage === null
                ? null
                : `${formatPercent(analysis.concentration.issuerMappedVolumeCoverage)} mapped volume`
            }
          />
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Price dispersion</h3>
            <span className="data-badge">
              {analysis.priceDispersion.sampleSize} valid prices
            </span>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <SmallMetric
              label="Weighted mean"
              value={formatCurrency(analysis.priceDispersion.weightedMeanPrice)}
            />
            <SmallMetric
              label="Raw deviation"
              value={formatPercent(
                analysis.priceDispersion.weightedAbsoluteDeviation,
              )}
            />
            <SmallMetric
              label="Robust deviation"
              value={formatPercent(
                analysis.priceDispersion.robustWeightedAbsoluteDeviation,
              )}
            />
          </dl>
        </div>
      </section>

      <section id="markets" className="scroll-mt-4 pt-10">
        <SectionHeading
          eyebrow="Underlying observations"
          title="Tokens and markets"
          description="Token metrics and market-pair observations are shown independently to avoid double counting."
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <TokenTable tokens={asset.tokens} />
          <MarketTable marketPairs={marketPairs} />
        </div>
      </section>

      <section id="evidence" className="scroll-mt-4 pt-10">
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
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
            <h3 className="font-semibold text-amber-950 dark:text-amber-100">
              Methodology warnings
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-amber-900 dark:text-amber-200">
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
      </section>

      <p className="mt-10 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
        RWA X-Ray is a research tool, not investment advice. Capacity estimates
        do not model order-book depth, slippage, fees, redemption restrictions,
        market hours, or guaranteed execution.
      </p>
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
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <div className="bg-slate-50 p-5 sm:p-6 dark:bg-slate-950/50">
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
            label="Volume participation"
            value={participation * 100}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(value) => setParticipation(value / 100)}
          />
          <RangeControl
            id="stress-haircut"
            label="Stress haircut"
            value={haircut * 100}
            min={0}
            max={90}
            step={1}
            onChange={(value) => setHaircut(value / 100)}
          />
        </div>
        <div className="p-5 sm:p-7">
          {result.status === "available" ? (
            <>
              <p className="eyebrow">Estimated capacity</p>
              <div className="mt-4 flex items-end gap-3">
                <strong className="text-5xl tracking-tight tabular-nums">
                  {formatDays(result.estimatedExitDays)}
                </strong>
                <span className="pb-1 text-sm text-slate-500">days</span>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                <SmallMetric
                  label="Effective volume"
                  value={formatMoney(result.effectiveVolume)}
                />
                <SmallMetric
                  label="Daily capacity"
                  value={formatMoney(result.dailyCapacity)}
                />
                <SmallMetric
                  label="Position / volume"
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
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange(value: number): void;
}) {
  return (
    <label className="mt-5 block" htmlFor={props.id}>
      <span className="flex justify-between text-xs font-semibold">
        <span>{props.label}</span>
        <output>{formatPercent(props.value / 100)}</output>
      </span>
      <input
        id={props.id}
        className="mt-3 w-full accent-blue-600"
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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="eyebrow">Quality at a glance</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Score
          value={marketCapacityHealth.score}
          label="Market Capacity Health"
          sublabel={`${Math.round(marketCapacityHealth.coverage * 100)}% component coverage`}
        />
        <Score
          value={evidenceCoverage.score}
          label="Evidence Coverage"
          sublabel={evidenceCoverage.label}
        />
      </div>
    </article>
  );
}

function Score({
  value,
  label,
  sublabel,
}: {
  value: number | null;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50">
      <span className="text-3xl font-semibold tabular-nums">
        {value === null ? "—" : Math.round(value)}
      </span>
      <span className="text-sm text-slate-400">/100</span>
      <p className="mt-2 text-xs font-semibold">{label}</p>
      <p className="mt-1 text-[11px] text-slate-500">{sublabel}</p>
    </div>
  );
}

function MetadataPanel({ data }: { data: AssetDetailResponse }) {
  const metadata = data.metadata;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="eyebrow">Asset context</p>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {metadata?.about?.description ??
          "CMC metadata description is unavailable for this asset."}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <SmallMetric
          label="Primary exchange"
          value={metadata?.primaryExchange ?? "Unavailable"}
        />
        <SmallMetric
          label="Founded"
          value={metadata?.founded ?? "Unavailable"}
        />
      </dl>
    </article>
  );
}

function ConcentrationCard({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactElement;
  label: string;
  value: AssetDetailResponse["analysis"]["concentration"]["market"];
  note?: string | null;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-blue-600 dark:text-blue-400">{icon}</span>
        <span className="data-badge">n={value.sampleSize}</span>
      </div>
      <h3 className="mt-4 font-semibold">{label}</h3>
      {value.status === "available" ? (
        <dl className="mt-4 grid grid-cols-2 gap-2">
          <SmallMetric
            label="Top share"
            value={formatPercent(value.top1Share)}
          />
          <SmallMetric
            label="Normalized HHI"
            value={formatNumber(value.normalizedHhi)}
          />
        </dl>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Insufficient observed volume.
        </p>
      )}
      {note ? <p className="mt-3 text-xs text-slate-500">{note}</p> : null}
    </article>
  );
}

function TokenTable({
  tokens,
}: {
  tokens: AssetDetailResponse["asset"]["tokens"];
}) {
  return (
    <DataPanel title="Underlying tokens" count={tokens.length}>
      {tokens.length === 0 ? (
        <EmptyRow text="No underlying token breakdown returned." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th>Token</th>
                <th>Issuer</th>
                <th className="text-right">Price</th>
                <th className="text-right">24h volume</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {tokens.map((token) => (
                <tr key={token.cryptoId}>
                  <td>
                    <strong>{token.symbol}</strong>
                    <span className="block text-xs text-slate-500">
                      {token.name}
                    </span>
                  </td>
                  <td>{token.issuerName ?? "Unmapped"}</td>
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
      )}
    </DataPanel>
  );
}

function MarketTable({
  marketPairs,
}: {
  marketPairs: AssetDetailResponse["marketPairs"];
}) {
  const pairs = marketPairs?.pairs ?? [];
  return (
    <DataPanel title="Market pairs" count={pairs.length}>
      {pairs.length === 0 ? (
        <EmptyRow text="Market-pair evidence is unavailable." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th>Pair</th>
                <th>Exchange</th>
                <th className="text-right">Price</th>
                <th className="text-right">24h volume</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {pairs.map((pair) => (
                <tr key={pair.marketId}>
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
      )}
    </DataPanel>
  );
}

function EvidenceFactors({ data }: { data: AssetDetailResponse }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Coverage factors</h3>
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
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600"
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
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h3 className="font-semibold">{title}</h3>
        <span className="data-badge">{count} records</span>
      </div>
      {children}
    </article>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm text-slate-500">
      <Database
        className="mx-auto mb-3 size-5 text-slate-400"
        aria-hidden="true"
      />
      {text}
    </div>
  );
}
function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
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
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-5 px-4 py-12 sm:px-6 lg:px-8"
      aria-label="Loading asset X-Ray"
    >
      <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      <span className="sr-only">Loading asset X-Ray</span>
    </div>
  );
}

function DetailError({ error, retry }: { error: unknown; retry(): void }) {
  const notFound = error instanceof RwaApiError && error.status === 404;
  return (
    <div className="mx-auto grid min-h-[65vh] max-w-xl place-items-center px-6 text-center">
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
