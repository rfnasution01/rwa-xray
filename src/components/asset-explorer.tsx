"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BarChart3,
  ChevronDown,
  Database,
  ExternalLink,
  Globe2,
  Layers3,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { type GlossaryTerm, TechnicalTerm } from "@/components/technical-term";
import { safeCmcImageUrl } from "@/lib/external-media";
import {
  type AssetType,
  type ExplorerItem,
  getExplorer,
  RwaApiError,
} from "@/lib/rwa-api";

const pageSize = 20;
const categories: Array<{ value: AssetType | "all"; label: string }> = [
  { value: "all", label: "All asset types" },
  { value: "government_security", label: "Government securities" },
  { value: "commodity", label: "Commodities" },
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
  { value: "currency", label: "Currencies" },
  { value: "real_estate", label: "Real estate" },
];

type ExplorerColumn =
  "identity" | "classification" | "marketCap" | "volume" | "turnover";

type ExplorerTableSort = {
  key: ExplorerColumn;
  direction: "asc" | "desc";
};

function compareExplorerItems(
  left: ExplorerItem,
  right: ExplorerItem,
  sort: ExplorerTableSort,
) {
  const leftValue = explorerSortValue(left, sort.key);
  const rightValue = explorerSortValue(right, sort.key);
  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;
  const comparison =
    typeof leftValue === "string" && typeof rightValue === "string"
      ? leftValue.localeCompare(rightValue)
      : Number(leftValue) - Number(rightValue);
  return sort.direction === "asc" ? comparison : -comparison;
}

function explorerSortValue(
  asset: ExplorerItem,
  column: ExplorerColumn,
): string | number | null {
  switch (column) {
    case "identity":
      return asset.name;
    case "classification":
      return asset.assetType;
    case "marketCap":
      return asset.quote.tokenizedMarketCap;
    case "volume":
      return asset.quote.tokenizedVolume24h;
    case "turnover":
      return asset.turnoverRatio;
  }
}

function SortableHeader({
  label,
  column,
  align = "left",
  sort,
  onSort,
}: {
  label: string;
  column: ExplorerColumn;
  align?: "left" | "right";
  sort: ExplorerTableSort;
  onSort(sort: ExplorerTableSort): void;
}) {
  const active = sort.key === column;
  return (
    <th
      className={`px-5 py-4 font-medium ${align === "right" ? "text-right" : "text-left"}`}
      aria-sort={
        active
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        className={`inline-flex items-center gap-1.5 ${align === "right" ? "ml-auto" : ""} transition-colors hover:text-[#a9fffa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55e9e2]`}
        type="button"
        onClick={() =>
          onSort({
            key: column,
            direction: active && sort.direction === "asc" ? "desc" : "asc",
          })
        }
      >
        {label}
        <ArrowUpDown className="size-3 text-[#4bc9c4]" aria-hidden="true" />
        <span className="sr-only">
          {active ? `, currently ${sort.direction}` : ""}
        </span>
      </button>
    </th>
  );
}

export function AssetExplorer() {
  const reduceMotion = useReducedMotion();
  const [category, setCategory] = useState<AssetType | "all">("all");
  const [sort, setSort] = useState<
    "rwa_rank" | "tokenized_market_cap" | "tokenized_volume_24h" | "symbol"
  >("tokenized_volume_24h");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tableSort, setTableSort] = useState<{
    key: ExplorerColumn;
    direction: "asc" | "desc";
  }>({ key: "volume", direction: "desc" });
  const start = (page - 1) * pageSize + 1;
  const query = useQuery({
    queryKey: ["asset-explorer", category, sort, start],
    refetchInterval: 60_000,
    queryFn: () =>
      getExplorer({
        assetType: category === "all" ? undefined : category,
        sort,
        sortDir: sort === "rwa_rank" || sort === "symbol" ? "asc" : "desc",
        start,
        limit: pageSize,
      }),
  });

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = needle
      ? (query.data?.items ?? []).filter(
          (asset) =>
            asset.name.toLowerCase().includes(needle) ||
            asset.symbol.toLowerCase().includes(needle),
        )
      : (query.data?.items ?? []);
    return [...filtered].sort((left, right) =>
      compareExplorerItems(left, right, tableSort),
    );
  }, [query.data?.items, search, tableSort]);
  const pageSummary = useMemo(() => {
    const items = query.data?.items ?? [];
    return {
      marketCap: sumAvailable(
        items.map((asset) => asset.quote.tokenizedMarketCap),
      ),
      volume24h: sumAvailable(
        items.map((asset) => asset.quote.tokenizedVolume24h),
      ),
      assetTypes: new Set(items.map((asset) => asset.assetType)).size,
    };
  }, [query.data?.items]);

  function changeCategory(value: AssetType | "all") {
    setCategory(value);
    setPage(1);
  }

  function changeSort(value: typeof sort) {
    setSort(value);
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setCategory("all");
    setSort("tokenized_volume_24h");
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return (
    <section className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#02090b] text-[#e7f3f1]">
      <div className="fx-explorer-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute top-[-16rem] right-[-10rem] size-[38rem] rounded-full bg-[#0f7776]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-[1600px] px-5 py-10 sm:px-8 lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute top-0 right-8 hidden h-64 w-[54%] [mask-image:linear-gradient(to_right,transparent,black_30%,black_80%,transparent)] opacity-45 lg:block">
          <Image
            src="/illustrations/rwa-market-globe.webp"
            alt=""
            fill
            sizes="54vw"
            className="object-cover object-[50%_42%]"
          />
        </div>
        <motion.div
          className="relative z-10 flex flex-col justify-between gap-7 lg:min-h-44 lg:flex-row lg:items-end"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.75, 0.25, 1] }}
        >
          <div>
            <p className="fx-kicker">Live RWA universe</p>
            <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] text-[#f0f7f5] sm:text-5xl lg:text-6xl">
              Asset <span className="fx-gradient-text">Explorer</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#91acad] sm:text-base">
              Compare reported activity without treating market capitalization
              as liquidity. Search applies to the current server-paginated page.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.12em] text-[#8bb0b0] uppercase">
            <span className="size-2 rounded-full bg-[#43e3a1] shadow-[0_0_10px_#43e3a1]" />
            <TechnicalTerm term="autoRefresh">
              Auto-refreshes every 60 seconds while active
            </TechnicalTerm>
          </div>
        </motion.div>

        <motion.div
          className="mt-9 border border-[#174749] bg-[#041214]/90 shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: reduceMotion ? 0 : 0.12,
            ease: [0.2, 0.75, 0.25, 1],
          }}
        >
          <div className="flex items-center justify-between border-b border-[#153b3d] px-5 py-3">
            <div className="flex items-center gap-3 font-mono text-[9px] font-semibold tracking-[0.18em] text-[#5de9e2] uppercase">
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              Universe controls
            </div>
            <div className="hidden items-center gap-2 font-mono text-[8px] tracking-[0.15em] text-[#467779] uppercase sm:flex">
              <span className="size-1.5 rounded-full bg-[#4ce8e1] shadow-[0_0_8px_#4ce8e1]" />
              Auto-refresh active
            </div>
          </div>

          <div className="grid gap-px bg-[#143638] md:grid-cols-[1fr_230px_210px_auto_auto]">
            <label className="relative block bg-[#041214] p-4">
              <span className="mb-2 block font-mono text-[8px] tracking-[0.16em] text-[#557f81] uppercase">
                <TechnicalTerm term="currentPageSearch" />
              </span>
              <span className="relative block">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#4bc9c4]"
                  aria-hidden="true"
                />
                <input
                  className="fx-explorer-input pl-10"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or symbol"
                />
              </span>
            </label>
            <ExplorerSelect term="assetClassification">
              <select
                className="fx-explorer-input appearance-none pr-10"
                value={category}
                onChange={(event) =>
                  changeCategory(event.target.value as AssetType | "all")
                }
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </ExplorerSelect>
            <ExplorerSelect term="orderDataset">
              <select
                className="fx-explorer-input appearance-none pr-10"
                value={sort}
                onChange={(event) =>
                  changeSort(event.target.value as typeof sort)
                }
              >
                <option value="tokenized_volume_24h">24h volume</option>
                <option value="tokenized_market_cap">Market cap</option>
                <option value="rwa_rank">RWA rank</option>
                <option value="symbol">Symbol</option>
              </select>
            </ExplorerSelect>
            <div className="flex items-end bg-[#041214] p-4 md:px-2">
              <button
                className="fx-explorer-tool"
                type="button"
                onClick={resetFilters}
                aria-label="Reset Explorer filters"
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Reset filters
              </button>
            </div>
            <div className="flex items-end bg-[#041214] p-4 md:pl-2">
              <button
                className="fx-explorer-tool px-3"
                type="button"
                onClick={() => void query.refetch()}
                aria-label="Refresh asset universe"
              >
                <RefreshCw
                  className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </motion.div>

        {query.data ? (
          <div className="mt-4 grid border border-[#174749] bg-[#041214]/90 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
              icon={BarChart3}
              term="sourceRecords"
              value={
                query.data.pagination.totalSize === null
                  ? "Unavailable"
                  : query.data.pagination.totalSize.toLocaleString("en-US")
              }
            />
            <SummaryMetric
              icon={Layers3}
              term="pageMarketCap"
              value={formatMoney(pageSummary.marketCap)}
            />
            <SummaryMetric
              icon={TrendingUp}
              term="pageVolume24h"
              value={formatMoney(pageSummary.volume24h)}
            />
            <SummaryMetric
              icon={Globe2}
              term="pageAssetTypes"
              value={String(pageSummary.assetTypes)}
            />
          </div>
        ) : null}

        {query.data?.stale ? (
          <div className="status-banner status-banner-warning mt-4">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            Showing the latest real cached dataset because live refresh is
            unavailable.
          </div>
        ) : null}

        <motion.div
          className="mt-5 overflow-visible border border-[#174749] bg-[#030e10]/95 shadow-[0_28px_80px_rgba(0,0,0,0.3)]"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{
            duration: 0.75,
            delay: reduceMotion ? 0 : 0.2,
            ease: [0.2, 0.75, 0.25, 1],
          }}
        >
          <div className="flex items-center justify-between border-b border-[#153b3d] px-5 py-3">
            <div className="flex items-center gap-3">
              <Activity className="size-4 text-[#55e8e1]" aria-hidden="true" />
              <h2 className="font-mono text-[10px] font-semibold tracking-[0.18em] text-[#b8cecd] uppercase">
                <TechnicalTerm term="assetRegistry">
                  Asset registry
                </TechnicalTerm>
              </h2>
            </div>
            <span className="font-mono text-[9px] tracking-[0.13em] text-[#4d7a7c] uppercase">
              {visibleItems.length.toString().padStart(2, "0")} visible records
            </span>
          </div>

          {query.isLoading ? <ExplorerSkeleton /> : null}
          {query.error ? (
            <ExplorerError
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : null}
          {query.data && visibleItems.length === 0 ? (
            <ExplorerEmpty filtered={Boolean(search.trim())} />
          ) : null}
          {visibleItems.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left">
                  <thead className="border-b border-[#153b3d] bg-[#061416] font-mono text-[9px] tracking-[0.14em] text-[#547f81] uppercase">
                    <tr>
                      <SortableHeader
                        label="Asset identity"
                        column="identity"
                        sort={tableSort}
                        onSort={setTableSort}
                      />
                      <SortableHeader
                        label="Classification"
                        column="classification"
                        sort={tableSort}
                        onSort={setTableSort}
                      />
                      <SortableHeader
                        label="Market cap"
                        column="marketCap"
                        align="right"
                        sort={tableSort}
                        onSort={setTableSort}
                      />
                      <SortableHeader
                        label="Volume · 24h"
                        column="volume"
                        align="right"
                        sort={tableSort}
                        onSort={setTableSort}
                      />
                      <SortableHeader
                        label="Turnover"
                        column="turnover"
                        align="right"
                        sort={tableSort}
                        onSort={setTableSort}
                      />
                      <th className="px-5 py-4">
                        <span className="sr-only">Open scenario</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#102f31]">
                    {visibleItems.map((asset, index) => (
                      <AssetRow
                        key={asset.rwaId}
                        asset={asset}
                        index={index}
                        reduceMotion={Boolean(reduceMotion)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-[#123335] md:hidden">
                {visibleItems.map((asset, index) => (
                  <AssetCard
                    key={asset.rwaId}
                    asset={asset}
                    index={index}
                    reduceMotion={Boolean(reduceMotion)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </motion.div>

        {query.data ? (
          <div className="mt-5 flex flex-col justify-between gap-4 border-t border-[#123638] pt-5 sm:flex-row sm:items-center">
            <p className="font-mono text-[9px] tracking-[0.12em] text-[#527c7e] uppercase">
              Page {String(page).padStart(2, "0")}
              {query.data.pagination.totalSize !== null
                ? ` · ${query.data.pagination.totalSize.toLocaleString("en-US")} source records`
                : ""}
            </p>
            <div className="flex gap-2">
              <PaginationButton
                disabled={page === 1}
                onClick={() => changePage(Math.max(1, page - 1))}
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> Previous
              </PaginationButton>
              <PaginationButton
                disabled={!query.data.pagination.hasMore}
                onClick={() => changePage(page + 1)}
              >
                Next <ArrowRight className="size-4" aria-hidden="true" />
              </PaginationButton>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryMetric({
  icon: Icon,
  term,
  value,
}: {
  icon: LucideIcon;
  term: GlossaryTerm;
  value: string;
}) {
  return (
    <div className="flex min-h-24 items-center gap-4 border-b border-[#174749] px-5 py-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0 sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0 sm:[&:nth-child(even)]:border-r-0 xl:[&:nth-child(even)]:border-r">
      <Icon className="size-7 shrink-0 text-[#59ebe4]" aria-hidden="true" />
      <div className="min-w-0">
        <strong className="block truncate font-mono text-lg font-medium text-[#9af9f4] tabular-nums">
          {value}
        </strong>
        <span className="mt-1 block font-mono text-[8px] tracking-[0.14em] text-[#57a3a3] uppercase">
          <TechnicalTerm term={term} />
        </span>
      </div>
    </div>
  );
}

function ExplorerSelect({
  term,
  children,
}: {
  term: GlossaryTerm;
  children: React.ReactNode;
}) {
  return (
    <label className="block bg-[#041214] p-4">
      <span className="mb-2 block font-mono text-[8px] tracking-[0.16em] text-[#557f81] uppercase">
        <TechnicalTerm term={term} />
      </span>
      <span className="relative block">
        {children}
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#49c8c3]"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function AssetRow({
  asset,
  index,
  reduceMotion,
}: {
  asset: ExplorerItem;
  index: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.tr
      className="group transition-colors hover:bg-[#082022]"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.25) }}
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <AssetLogo asset={asset} />
          <span className="min-w-0">
            <span className="block max-w-64 truncate text-sm font-medium text-[#dce9e7]">
              {asset.name}
            </span>
            <span className="mt-1 block font-mono text-[9px] tracking-[0.1em] text-[#527b7d] uppercase">
              {asset.symbol} · RWA #{asset.rwaId}
            </span>
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="fx-data-badge">{formatType(asset.assetType)}</span>
      </td>
      <MetricCell value={formatMoney(asset.quote.tokenizedMarketCap)} />
      <MetricCell value={formatMoney(asset.quote.tokenizedVolume24h)} />
      <MetricCell value={formatPercent(asset.turnoverRatio)} highlight />
      <td className="px-5 py-4 text-right">
        <Link
          className="inline-flex min-h-8 items-center gap-3 border border-[#267174] bg-[#082426] px-3 font-mono text-[9px] font-semibold tracking-[0.1em] text-[#58e7e0] uppercase shadow-[inset_0_0_14px_rgba(54,225,216,0.05)] transition hover:border-[#5aeee7] hover:bg-[#0b3032] hover:text-[#bafffa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58ddd7]"
          href={`/assets/${asset.rwaId}`}
        >
          Open X-Ray <ExternalLink className="size-3" aria-hidden="true" />
        </Link>
      </td>
    </motion.tr>
  );
}

function AssetLogo({ asset }: { asset: ExplorerItem }) {
  const logoUrl = safeCmcImageUrl(asset.logo);
  return (
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden border border-[#245c5f] bg-[#082022] font-mono text-[9px] font-bold tracking-wider text-[#61e9e3] transition group-hover:border-[#45beba]">
      {logoUrl ? (
        <Image
          className="object-contain p-1.5"
          src={logoUrl}
          alt={`${asset.name} logo`}
          fill
          sizes="40px"
        />
      ) : (
        asset.symbol.slice(0, 4)
      )}
    </span>
  );
}

function MetricCell({
  value,
  highlight = false,
}: {
  value: string;
  highlight?: boolean;
}) {
  const unavailable = value === "Unavailable";
  return (
    <td
      className={`px-5 py-4 text-right font-mono text-xs font-medium tabular-nums ${
        unavailable
          ? "text-[#6e8585]"
          : highlight
            ? "text-[#5fe8e1]"
            : "text-[#c5d5d4]"
      }`}
    >
      {value}
    </td>
  );
}

function AssetCard({
  asset,
  index,
  reduceMotion,
}: {
  asset: ExplorerItem;
  index: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.article
      className="group bg-[#030e10] p-5 transition-colors hover:bg-[#071a1c]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.24) }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AssetLogo asset={asset} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-[#dce9e7]">
              {asset.name}
            </h2>
            <p className="mt-1 font-mono text-[8px] tracking-[0.1em] text-[#527b7d] uppercase">
              {asset.symbol} · {formatType(asset.assetType)}
            </p>
          </div>
        </div>
        <Link
          className="inline-flex shrink-0 items-center gap-1 font-mono text-[9px] font-semibold tracking-wider text-[#58ddd7] uppercase"
          href={`/assets/${asset.rwaId}`}
        >
          Open <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
      <dl className="mt-5 grid grid-cols-3 divide-x divide-[#153638] border-y border-[#153638] py-4 text-xs">
        <CardMetric
          term="tokenizedMarketCap"
          value={formatMoney(asset.quote.tokenizedMarketCap)}
        />
        <CardMetric
          term="reportedVolume24h"
          value={formatMoney(asset.quote.tokenizedVolume24h)}
        />
        <CardMetric
          term="turnoverRatio"
          value={formatPercent(asset.turnoverRatio)}
          highlight
        />
      </dl>
    </motion.article>
  );
}

function CardMetric({
  term,
  value,
  highlight = false,
}: {
  term: GlossaryTerm;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 px-2 first:pl-0 last:pr-0">
      <dt className="truncate font-mono text-[8px] tracking-wider text-[#527b7d] uppercase">
        <TechnicalTerm term={term} />
      </dt>
      <dd
        className={`mt-2 truncate font-mono text-[10px] font-medium ${highlight ? "text-[#5fe8e1]" : "text-[#c5d5d4]"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function PaginationButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick(): void;
}) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#226063] bg-[#061719] px-4 font-mono text-[9px] font-semibold tracking-[0.1em] text-[#79d9d5] uppercase transition hover:border-[#50e9e2] hover:text-[#c6fffb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#50e9e2] disabled:cursor-not-allowed disabled:border-[#173638] disabled:text-[#385d5f]"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ExplorerSkeleton() {
  return (
    <div className="fx-explorer-skeleton" aria-label="Loading RWA assets">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="grid min-h-16 grid-cols-[48px_1fr_100px] items-center gap-4 border-b border-[#102f31] px-5 last:border-b-0 md:grid-cols-[48px_1fr_140px_140px_100px]"
        >
          <div className="fx-skeleton-cell size-9" />
          <div>
            <div className="fx-skeleton-line h-3 w-36 max-w-full" />
            <div className="fx-skeleton-line mt-2 h-2 w-20" />
          </div>
          <div className="fx-skeleton-line h-3 w-full" />
          <div className="fx-skeleton-line hidden h-3 w-full md:block" />
          <div className="fx-skeleton-line hidden h-3 w-full md:block" />
        </div>
      ))}
      <span className="sr-only">Loading RWA assets</span>
    </div>
  );
}

function ExplorerError({ error, retry }: { error: unknown; retry(): void }) {
  const rateLimited = error instanceof RwaApiError && error.status === 429;
  return (
    <div className="p-12 text-center" role="alert">
      <span className="mx-auto grid size-12 place-items-center border border-[#8d3f46] bg-[#241013]">
        <AlertTriangle className="size-5 text-[#ef8d96]" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-medium text-[#e6efed]">
        {rateLimited ? "Refresh limit reached" : "RWA universe unavailable"}
      </h2>
      <p className="mt-2 text-sm text-[#6f9092]">
        No synthetic rows are substituted. Retry the real data request.
      </p>
      <button
        className="fx-button-secondary mt-6"
        type="button"
        onClick={retry}
      >
        <RefreshCw className="size-4" aria-hidden="true" /> Retry
      </button>
    </div>
  );
}

function ExplorerEmpty({ filtered }: { filtered: boolean }) {
  return (
    <div className="p-12 text-center">
      <span className="mx-auto grid size-12 place-items-center border border-[#245c5f] bg-[#082022]">
        <Database className="size-5 text-[#56dcd6]" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-medium text-[#e1ecea]">
        {filtered ? "No match on this page" : "No assets returned"}
      </h2>
      <p className="mt-2 text-sm text-[#6f9092]">
        {filtered
          ? "Clear the search or move to another page."
          : "CMC currently has no valid records for this selection."}
      </p>
    </div>
  );
}

function sumAvailable(values: Array<number | null>) {
  const available = values.filter((value): value is number => value !== null);
  return available.length === 0
    ? null
    : available.reduce((total, value) => total + value, 0);
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

function formatType(value: string) {
  return value.replaceAll("_", " ");
}
