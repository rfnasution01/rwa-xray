"use client";

import { Building2, ExternalLink, Layers3, Store } from "lucide-react";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import {
  DataPanel,
  EmptyDataPanel,
} from "@/components/asset-detail/data-panel";
import {
  formatCurrency,
  formatMoney,
  issuerHref,
  safeExternalUrl,
} from "@/components/asset-detail/formatters";
import {
  SortableHeader,
  TablePagination,
  useSortableTable,
  type SortValue,
} from "@/components/asset-detail/sortable-table";
import type { AssetDetailResponse } from "@/lib/rwa-api";

const marketViews = ["tokens", "tradfi", "pairs"] as const;
type MarketView = (typeof marketViews)[number];

export function MarketsWorkspace({
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
        <EmptyDataPanel text="No underlying token breakdown returned." />
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
        <EmptyDataPanel text="No TradFi market references were returned." />
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
        <EmptyDataPanel text="Market-pair evidence is unavailable." />
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
