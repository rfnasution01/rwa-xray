"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Database,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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

export function AssetExplorer() {
  const [category, setCategory] = useState<AssetType | "all">("all");
  const [sort, setSort] = useState<
    "rwa_rank" | "tokenized_market_cap" | "tokenized_volume_24h" | "symbol"
  >("tokenized_volume_24h");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
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
    if (!needle) return query.data?.items ?? [];
    return (query.data?.items ?? []).filter(
      (asset) =>
        asset.name.toLowerCase().includes(needle) ||
        asset.symbol.toLowerCase().includes(needle),
    );
  }, [query.data?.items, search]);

  function changeCategory(value: AssetType | "all") {
    setCategory(value);
    setPage(1);
  }

  function changeSort(value: typeof sort) {
    setSort(value);
    setPage(1);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Live RWA universe</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Asset Explorer
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Compare reported activity without treating market capitalization as
            liquidity. Search applies to the current server-paginated page.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span
            className="size-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          Auto-refreshes every 60 seconds while active
        </div>
      </div>

      <div className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_220px] dark:border-slate-800 dark:bg-slate-900">
        <label className="relative block">
          <span className="sr-only">Search current page</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            className="control-input pl-10"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or symbol"
          />
        </label>
        <label>
          <span className="sr-only">Asset type</span>
          <select
            className="control-input"
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
        </label>
        <label>
          <span className="sr-only">Sort assets</span>
          <select
            className="control-input"
            value={sort}
            onChange={(event) => changeSort(event.target.value as typeof sort)}
          >
            <option value="tokenized_volume_24h">24h volume</option>
            <option value="tokenized_market_cap">Market cap</option>
            <option value="rwa_rank">RWA rank</option>
            <option value="symbol">Symbol</option>
          </select>
        </label>
      </div>

      {query.data?.stale ? (
        <div className="status-banner status-banner-warning mt-4">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          Showing the latest real cached dataset because live refresh is
          unavailable.
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                <thead className="bg-slate-50 text-[11px] tracking-wider text-slate-500 uppercase dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Asset</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Market cap
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Volume · 24h
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Turnover
                    </th>
                    <th className="px-5 py-3">
                      <span className="sr-only">Open scenario</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleItems.map((asset) => (
                    <AssetRow key={asset.rwaId} asset={asset} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {visibleItems.map((asset) => (
                <AssetCard key={asset.rwaId} asset={asset} />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {query.data ? (
        <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {page}
            {query.data.pagination.totalSize !== null
              ? ` · ${query.data.pagination.totalSize.toLocaleString("en-US")} source records`
              : ""}
          </p>
          <div className="flex gap-2">
            <button
              className="button-secondary"
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Previous
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={!query.data.pagination.hasMore}
              onClick={() => setPage((value) => value + 1)}
            >
              Next <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AssetRow({ asset }: { asset: ExplorerItem }) {
  return (
    <tr className="transition hover:bg-blue-50/40 dark:hover:bg-blue-950/15">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-slate-100 font-mono text-[10px] font-bold dark:bg-slate-800">
            {asset.symbol.slice(0, 4)}
          </span>
          <span>
            <span className="block text-sm font-semibold">{asset.name}</span>
            <span className="block text-xs text-slate-500">
              {asset.symbol} · #{asset.rwaId}
            </span>
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="data-badge">{formatType(asset.assetType)}</span>
      </td>
      <td className="px-5 py-4 text-right text-sm font-medium tabular-nums">
        {formatMoney(asset.quote.tokenizedMarketCap)}
      </td>
      <td className="px-5 py-4 text-right text-sm font-medium tabular-nums">
        {formatMoney(asset.quote.tokenizedVolume24h)}
      </td>
      <td className="px-5 py-4 text-right text-sm font-medium tabular-nums">
        {formatPercent(asset.turnoverRatio)}
      </td>
      <td className="px-5 py-4 text-right">
        <Link
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
          href={`/assets/${asset.rwaId}`}
        >
          Open X-Ray
        </Link>
      </td>
    </tr>
  );
}

function AssetCard({ asset }: { asset: ExplorerItem }) {
  return (
    <article className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{asset.name}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {asset.symbol} · {formatType(asset.assetType)}
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-blue-600 dark:text-blue-400"
          href={`/assets/${asset.rwaId}`}
        >
          Open
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-slate-500">Market cap</dt>
          <dd className="mt-1 font-semibold">
            {formatMoney(asset.quote.tokenizedMarketCap)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">24h volume</dt>
          <dd className="mt-1 font-semibold">
            {formatMoney(asset.quote.tokenizedVolume24h)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Turnover</dt>
          <dd className="mt-1 font-semibold">
            {formatPercent(asset.turnoverRatio)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-3 p-5" aria-label="Loading RWA assets">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ))}
      <span className="sr-only">Loading RWA assets</span>
    </div>
  );
}

function ExplorerError({ error, retry }: { error: unknown; retry(): void }) {
  const rateLimited = error instanceof RwaApiError && error.status === 429;
  return (
    <div className="p-10 text-center" role="alert">
      <AlertTriangle
        className="mx-auto size-7 text-rose-500"
        aria-hidden="true"
      />
      <h2 className="mt-3 font-semibold">
        {rateLimited ? "Refresh limit reached" : "RWA universe unavailable"}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        No synthetic rows are substituted. Retry the real data request.
      </p>
      <button className="button-secondary mt-5" type="button" onClick={retry}>
        <RefreshCw className="size-4" aria-hidden="true" /> Retry
      </button>
    </div>
  );
}

function ExplorerEmpty({ filtered }: { filtered: boolean }) {
  return (
    <div className="p-12 text-center">
      <Database className="mx-auto size-7 text-slate-400" aria-hidden="true" />
      <h2 className="mt-3 font-semibold">
        {filtered ? "No match on this page" : "No assets returned"}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        {filtered
          ? "Clear the search or move to another page."
          : "CMC currently has no valid records for this selection."}
      </p>
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
