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
      "The estimated number of 24-hour periods needed for the scenario position: position value divided by daily capacity. Lower values indicate more observed capacity relative to the position. It is not a guaranteed execution time and does not model order-book depth, slippage, fees, or market access.",
  },
  planningHorizon: {
    label: "Planning horizon",
    definition:
      "A neutral band derived from Estimated Exit Days: under 1 day, 1–3 days, 3–7 days, or over 7 days. It helps interpret the scenario and is not a liquidity grade or execution promise.",
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
  explorerCacheState: {
    label: "Cache status",
    definition:
      "Fresh means a valid cached response was served; refreshed means this request fetched and cached upstream data; stale means an upstream refresh failed and the latest real cached response is being shown.",
  },
  explorerObservedAt: {
    label: "Observed",
    definition:
      "When RWA X-Ray received and normalized this asset-list dataset. This application observation time is separate from each asset's upstream market-data timestamp.",
  },
  assetRegistry: {
    label: "Asset registry",
    definition:
      "The current paginated list of canonical RWA assets returned by the internal API.",
  },
  marketPairs: {
    label: "Market pairs",
    definition:
      "The trading venues and pairs where tokenized activity is observed. Each pair is treated as a separate market observation.",
  },
  exchanges: {
    label: "Exchanges",
    definition:
      "The venues represented by the observed market pairs. Concentration shows whether activity depends on a small number of venues.",
  },
  tokens: {
    label: "Tokens",
    definition:
      "The tokenized representations linked to the asset. Token concentration shows how observed activity is distributed across them.",
  },
  issuers: {
    label: "Issuers",
    definition:
      "Entities associated with issuing or representing the underlying tokenized products. Mapping may be incomplete.",
  },
  priceDispersion: {
    label: "Price dispersion",
    definition:
      "The difference between observed prices across markets, weighted by reported volume where available.",
  },
  weightedMean: {
    label: "Weighted mean",
    definition:
      "An average price where observations with more reported volume contribute more to the result.",
  },
  rawDeviation: {
    label: "Raw deviation",
    definition:
      "Volume-weighted absolute price deviation before robust outlier handling.",
  },
  robustDeviation: {
    label: "Robust deviation",
    definition:
      "Price deviation calculated after flagging robust outliers with median-based detection.",
  },
  topShare: {
    label: "Top share",
    definition:
      "The share of observed volume represented by the largest entity in that concentration dimension.",
  },
  normalizedHhi: {
    label: "Normalized HHI",
    definition:
      "A 0–1 concentration measure adjusted for the number of observations. Higher values indicate more concentration.",
  },
  positionValue: {
    label: "Position value",
    definition:
      "The USD size of the scenario position used in the capacity calculation.",
  },
  sourceLineage: {
    label: "Sanitized source lineage",
    definition:
      "Safe record of which internal source datasets contributed to the analysis, without credentials or raw sensitive headers.",
  },
  coverageFactors: {
    label: "Coverage factors",
    definition:
      "The individual evidence checks that contribute to the overall Evidence Coverage score.",
  },
  primaryExchange: {
    label: "Primary exchange",
    definition:
      "The main exchange reported in the asset metadata. It does not represent all observed market venues.",
  },
  founded: {
    label: "Founded",
    definition:
      "The founding date or year reported in the asset metadata. It is descriptive, not a verification of legal status.",
  },
  employeeCount: {
    label: "Employees",
    definition:
      "The latest employee count reported in CMC asset metadata. Reporting periods and coverage can differ between assets.",
  },
  cik: {
    label: "CIK",
    definition:
      "The Central Index Key used by the U.S. SEC to identify a company in EDGAR filings. Availability does not verify that a token provides a legal claim on the company.",
  },
  metadataDateAdded: {
    label: "Metadata added",
    definition:
      "When this asset metadata record was added to the CoinMarketCap dataset, not when the asset or its tokenization launched.",
  },
  firstHistoricalData: {
    label: "CMC history begins",
    definition:
      "The earliest historical-data timestamp reported by the CMC RWA map for this canonical asset. It describes upstream coverage and does not mean RWA X-Ray currently exposes a historical price series.",
  },
  lastHistoricalData: {
    label: "CMC latest history",
    definition:
      "The latest historical-data timestamp reported by the CMC RWA map. It is coverage metadata, not the current quote timestamp or a guarantee of continuous observations.",
  },
  tokenizationStatus: {
    label: "Tokenization status",
    definition:
      "Whether CMC reports token records linked to this RWA. It does not verify reserves, redemption rights, or legal ownership.",
  },
  assetSelection: {
    label: "Select assets",
    definition:
      "Choose two to four canonical RWA assets to evaluate under the same scenario assumptions. Initial peers prioritize the target category and similarity in tokenized market cap and 24-hour volume.",
  },
  sharedScenario: {
    label: "Shared scenario",
    definition:
      "One position size, participation rate, and stress haircut applied consistently to every selected asset.",
  },
  neutralOrdering: {
    label: "Neutral ordering",
    definition:
      "Results are ordered by estimated exit days for scenario convenience. This is not a best-asset ranking or recommendation.",
  },
  dailyCapacity: {
    label: "Daily capacity",
    definition:
      "The scenario amount of observed volume available per day after participation and stress assumptions.",
  },
  topMarketShare: {
    label: "Top market share",
    definition:
      "The percentage of observed market-pair volume represented by the largest market in the available data.",
  },
  comparisonEvidenceGap: {
    label: "Evidence gap",
    definition:
      "A missing or unavailable source that limits one or more comparison metrics. It is not converted into a zero result.",
  },
  observedData: {
    label: "Observed data",
    definition:
      "Normalized source observations received by RWA X-Ray, including source timestamps and availability status.",
  },
  explicitAssumptions: {
    label: "Explicit assumptions",
    definition:
      "Scenario inputs that are shown and adjustable, rather than hidden inside a black-box calculation.",
  },
  missingData: {
    label: "Missing data",
    definition:
      "An unavailable input that remains null or unavailable, lowers evidence coverage, and is never silently converted to zero.",
  },
  positionVariable: {
    label: "P · Position value",
    definition:
      "The USD value of the position being tested in the capacity scenario.",
  },
  volumeVariable: {
    label: "V · Observed volume",
    definition:
      "Reported tokenized trading volume during the latest 24-hour window.",
  },
  participationVariable: {
    label: "r · Participation rate",
    definition:
      "The fraction of effective volume used by the scenario, bounded to the supported input range.",
  },
  haircutVariable: {
    label: "h · Stress haircut",
    definition:
      "The fraction removed from reported volume to model a lower-activity scenario.",
  },
  volumeShare: {
    label: "Volume share",
    definition:
      "An entity's observed volume divided by the total valid volume in the same concentration dimension.",
  },
  hhi: {
    label: "HHI",
    definition:
      "Herfindahl–Hirschman Index: the sum of squared volume shares used to describe concentration.",
  },
  normalizedHhiMethod: {
    label: "Normalized HHI",
    definition:
      "HHI adjusted for the number of observations so concentration can be compared on a 0–1 scale.",
  },
  pairFreshness: {
    label: "Market-pair freshness",
    definition:
      "How recently market-pair observations were updated. Older pairs receive lower evidence treatment or are excluded.",
  },
  priceConsistency: {
    label: "Price consistency",
    definition:
      "A Health component describing how closely observed market prices agree after robust dispersion handling.",
  },
  marketAvailability: {
    label: "Market availability",
    definition:
      "A Health component based on the number and breadth of available market-pair observations.",
  },
  dataFreshness: {
    label: "Data freshness",
    definition:
      "A Health component based on the age of the source observations when analysis is calculated.",
  },
  aggregateQuote: {
    label: "Aggregate quote",
    definition:
      "The reported asset-level price, market cap, or volume observation used as a primary input.",
  },
  freshTimestamp: {
    label: "Fresh source timestamp",
    definition:
      "A source update timestamp that is present and recent enough for the evidence check.",
  },
  marketPairCoverage: {
    label: "Market-pair coverage",
    definition:
      "Evidence that at least the required valid market-pair observations are available for analysis.",
  },
  tokenBreakdown: {
    label: "Token breakdown",
    definition:
      "Evidence describing the underlying token representations and their available metrics.",
  },
  issuerMapping: {
    label: "Issuer mapping",
    definition:
      "Evidence linking tokenized representations to known issuers where mapping data is available.",
  },
  crossFieldConsistency: {
    label: "Cross-field consistency",
    definition:
      "Checks that related fields are valid, non-negative, uniquely identified, and use consistent currency and scope.",
  },
  compareAssetSearch: {
    label: "Search comparison candidates",
    definition:
      "Search exact symbols and normalized asset slugs through a bounded server lookup, with partial-name matching among top-volume assets. At most 50 candidates are returned.",
  },
} as const;

export type GlossaryTerm = keyof typeof glossary;

export function TechnicalTerm({
  term,
  children,
  definition,
  className = "",
  align = "left",
}: {
  term: GlossaryTerm;
  children?: ReactNode;
  definition?: ReactNode;
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
        <span className="fx-term-card-copy">
          {definition ?? entry.definition}
        </span>
      </span>
    </span>
  );
}
