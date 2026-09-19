"use client";

import { CircleHelp } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

const glossary = {
  rwa: {
    label: "tokenized real-world asset",
    definition:
      "A digital token linked to an off-chain asset or financial instrument, such as a Treasury, commodity, stock, or property interest.",
  },
  observedMarketActivity: {
    label: "observed market activity",
    definition:
      "Recently reported price and trading-volume data. It describes what was observed, not what will be available for a future order.",
  },
  concentrationRisk: {
    label: "concentration risk",
    definition:
      "The risk that activity depends heavily on one market, exchange, token, or issuer rather than being broadly distributed.",
  },
  evidenceCoverage: {
    label: "Evidence Coverage",
    definition:
      "A 0–100 measure of how complete and usable the supporting observations are. It measures evidence quality, not asset safety.",
  },
  observedMarketCapacity: {
    label: "observed market capacity",
    definition:
      "A volume-based planning proxy for how much of a position the observed market activity could absorb under explicit assumptions.",
  },
  averageTokenizedPrice: {
    label: "Average tokenized price",
    definition:
      "The aggregate USD price reported across tokenized representations of the underlying real-world asset.",
  },
  tokenizedMarketCap: {
    label: "Tokenized market cap",
    definition:
      "The reported USD value of the tokenized supply. A large market cap does not guarantee active trading or easy execution.",
  },
  reportedVolume24h: {
    label: "Reported volume · 24h",
    definition:
      "The aggregate USD trading volume reported during the latest 24-hour window. It is not the same as current order-book depth.",
  },
  turnoverRatio: {
    label: "Turnover ratio",
    definition:
      "Reported 24-hour volume divided by tokenized market cap. It shows activity relative to asset size, not guaranteed liquidity.",
  },
  marketCapacityHealth: {
    label: "Market Capacity Health",
    definition:
      "A composite view of available activity, diversification, price consistency, market availability, and freshness. It is not an investment rating.",
  },
  volumeParticipation: {
    label: "Volume participation",
    definition:
      "The percentage of effective 24-hour volume the scenario assumes your position can represent. Lower percentages are more conservative.",
  },
  stressHaircut: {
    label: "Stress haircut",
    definition:
      "A percentage reduction applied to reported volume to test a lower-activity scenario. A 50% haircut uses half of observed volume.",
  },
  estimatedExitDays: {
    label: "Estimated exit days",
    definition:
      "Position value divided by daily scenario capacity. It is a planning estimate—not a guaranteed execution time.",
  },
  effectiveVolume: {
    label: "Effective volume",
    definition:
      "Reported 24-hour volume after applying the selected stress haircut.",
  },
  dailyExitCapacity: {
    label: "Daily exit capacity",
    definition:
      "Effective volume multiplied by the selected participation rate. It is a scenario capacity, not an executable quote.",
  },
  positionToVolume: {
    label: "Position / volume",
    definition:
      "Position value divided by reported 24-hour volume. It shows how large the position is relative to observed activity.",
  },
  sourceRecords: {
    label: "Source records",
    definition:
      "The number of asset records returned by the current API dataset. It is not a global market total when the response is paginated.",
  },
  pageMarketCap: {
    label: "Page market cap",
    definition:
      "The sum of available tokenized market caps on the current server-paginated page, not the entire RWA universe.",
  },
  pageVolume24h: {
    label: "Page volume · 24h",
    definition:
      "The sum of available reported 24-hour volumes on the current server-paginated page.",
  },
  pageAssetTypes: {
    label: "Page asset types",
    definition:
      "The number of distinct asset classifications represented on the current server-paginated page.",
  },
  currentPageSearch: {
    label: "Search current page",
    definition:
      "Search filters only the records already loaded on the current server-paginated page; it does not search the full universe.",
  },
  assetClassification: {
    label: "Asset classification",
    definition:
      "Filter by the RWA category reported by CoinMarketCap, such as commodity, ETF, or government security.",
  },
  orderDataset: {
    label: "Order dataset",
    definition:
      "Choose which reported field determines the order of the current Explorer response. It does not rank assets as recommendations.",
  },
  autoRefresh: {
    label: "Auto-refresh",
    definition:
      "The Explorer requests updated data every 60 seconds while the browser tab is active.",
  },
  assetRegistry: {
    label: "Asset registry",
    definition:
      "The current paginated list of canonical RWA assets returned by the internal API.",
  },
} as const;

export type GlossaryTerm = keyof typeof glossary;

export function TechnicalTerm({
  term,
  children,
  className = "",
  align = "left",
}: {
  term: GlossaryTerm;
  children?: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  const [pinned, setPinned] = useState(false);
  const tooltipId = useId();
  const entry = glossary[term];

  return (
    <span className={`fx-term relative inline-flex ${className}`}>
      <button
        className="fx-term-trigger"
        type="button"
        aria-describedby={tooltipId}
        aria-expanded={pinned}
        onClick={() => setPinned((current) => !current)}
        onBlur={() => setPinned(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setPinned(false);
            event.currentTarget.blur();
          }
        }}
      >
        <span>{children ?? entry.label}</span>
        <CircleHelp className="size-3 shrink-0" aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        className={`${pinned ? "fx-term-card fx-term-card-visible" : "fx-term-card"} ${
          align === "right" ? "fx-term-card-right" : ""
        }`}
        role="tooltip"
      >
        <span className="fx-term-card-title">{entry.label}</span>
        <span className="fx-term-card-copy">{entry.definition}</span>
      </span>
    </span>
  );
}
