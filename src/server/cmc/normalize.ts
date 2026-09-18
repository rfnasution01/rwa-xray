import "server-only";

import type {
  AggregateQuote,
  AssetIdentity,
  AssetMetadata,
  CmcEndpoint,
  DetailedAsset,
  DiscoveryAsset,
  IssuerDetail,
  IssuerSummary,
  ListedAsset,
  MarketPair,
  MarketPairs,
  NormalizationWarning,
  NormalizedDataset,
  Page,
  RwaToken,
  SourceEvidence,
  TradfiMarket,
} from "@/domain/assets/models";

import type {
  RwaAssetsListResponse,
  RwaInfoResponse,
  RwaIssuerResponse,
  RwaIssuersListResponse,
  RwaMapResponse,
  RwaMarketPairsResponse,
  RwaQuotesLatestResponse,
} from "./schemas";

export type NormalizationContext = {
  observedAt?: Date;
};

type WarningCollector = NormalizationWarning[];
type ApiStatus = RwaMapResponse["status"];
type BaseAsset = RwaMapResponse["data"]["rwa_assets"][number];
type ValidBaseAsset = BaseAsset & { rwa_id: number };
type ListedApiAsset = RwaAssetsListResponse["data"]["rwa_assets"][number];

export function normalizeRwaMap(
  response: RwaMapResponse,
  context: NormalizationContext = {},
): NormalizedDataset<Page<DiscoveryAsset>> {
  const warnings: WarningCollector = [];
  const items = validRwaAssets(response.data.rwa_assets, warnings).map(
    ({ asset, index }) => ({
      ...normalizeIdentity(asset),
      firstHistoricalData: normalizeTimestamp(
        asset.first_historical_data,
        `data.rwa_assets[${index}].first_historical_data`,
        warnings,
      ),
      lastHistoricalData: normalizeTimestamp(
        asset.last_historical_data,
        `data.rwa_assets[${index}].last_historical_data`,
        warnings,
      ),
    }),
  );

  return dataset(
    {
      items,
      ...normalizeOptionalPagination(response.data, "data", warnings),
    },
    "/v5/real-world-assets/map",
    response.status,
    warnings,
    context,
  );
}

export function normalizeRwaInfo(
  response: RwaInfoResponse,
  context: NormalizationContext = {},
): NormalizedDataset<AssetMetadata[]> {
  const warnings: WarningCollector = [];
  const data = validRwaAssets(response.data.rwa_assets, warnings).map(
    ({ asset, index }): AssetMetadata => ({
      ...normalizeIdentity(asset),
      website: nullable(asset.website),
      employees: nullable(asset.employees),
      founded: nullable(asset.founded),
      industry: nullable(asset.industry),
      cik: nullable(asset.cik),
      primaryExchange: nullable(asset.primary_exchange),
      about: asset.about
        ? {
            description: nullable(asset.about.description),
            logo: nullable(asset.about.logo),
            website: nullable(asset.about.website),
            dateAdded: normalizeTimestamp(
              asset.about.date_added,
              `data.rwa_assets[${index}].about.date_added`,
              warnings,
            ),
          }
        : null,
    }),
  );

  return dataset(
    data,
    "/v5/real-world-assets/info",
    response.status,
    warnings,
    context,
  );
}

export function normalizeRwaAssetsList(
  response: RwaAssetsListResponse,
  context: NormalizationContext = {},
): NormalizedDataset<Page<ListedAsset>> {
  const warnings: WarningCollector = [];
  const items = validRwaAssets(response.data.rwa_assets, warnings).map(
    ({ asset, index }): ListedAsset => ({
      ...normalizeIdentity(asset),
      quote: normalizeAggregateQuote(
        asset,
        `data.rwa_assets[${index}]`,
        warnings,
      ),
    }),
  );

  return dataset(
    {
      items,
      ...normalizeOptionalPagination(response.data, "data", warnings),
    },
    "/v5/real-world-assets/assets/list",
    response.status,
    warnings,
    context,
  );
}

export function normalizeRwaMarketPairs(
  response: RwaMarketPairsResponse,
  context: NormalizationContext = {},
): NormalizedDataset<MarketPairs> {
  const warnings: WarningCollector = [];
  const pairs = response.data.market_pairs.map((pair, index): MarketPair => {
    const quote = pair.quotes.find((candidate) => candidate.symbol === "USD");
    if (!quote) {
      warnings.push({
        code: "USD_QUOTE_MISSING",
        path: `data.market_pairs[${index}].quotes`,
        message: "No normalized USD quote was returned for this market pair",
      });
    }

    return {
      marketId: pair.market_id,
      marketPair: pair.market_pair,
      category: pair.category,
      feeType: nullable(pair.fee_type),
      exchange: {
        id: pair.exchange.exchange_id,
        name: pair.exchange.name,
        slug: pair.exchange.slug,
      },
      base: {
        cryptoId: nullable(pair.market_pair_base.crypto_id),
        symbol: pair.market_pair_base.symbol,
        exchangeSymbol: nullable(pair.market_pair_base.exchange_symbol),
        currencyType: nullable(pair.market_pair_base.currency_type),
      },
      quote: {
        cryptoId: nullable(pair.market_pair_quote.crypto_id),
        symbol: pair.market_pair_quote.symbol,
        exchangeSymbol: nullable(pair.market_pair_quote.exchange_symbol),
        currencyType: nullable(pair.market_pair_quote.currency_type),
      },
      marketQuote: {
        currency: "USD",
        price: nullable(quote?.price),
        volume24h: nullable(quote?.volume_24h),
        sourceUpdatedAt: normalizeTimestamp(
          quote?.last_updated,
          `data.market_pairs[${index}].quotes[USD].last_updated`,
          warnings,
        ),
      },
    };
  });

  return dataset(
    {
      rwaId: response.data.rwa_id,
      name: response.data.name,
      symbol: response.data.symbol,
      reportedPairCount: response.data.num_market_pairs,
      pairs,
      totalSize: response.data.total_size,
      hasMore: response.data.has_more,
    },
    "/v5/real-world-assets/market-pairs/list",
    response.status,
    warnings,
    context,
  );
}

export function normalizeRwaQuotesLatest(
  response: RwaQuotesLatestResponse,
  context: NormalizationContext = {},
): NormalizedDataset<DetailedAsset[]> {
  const warnings: WarningCollector = [];
  const data = validRwaAssets(response.data.rwa_assets, warnings).map(
    ({ asset, index: assetIndex }): DetailedAsset => ({
      ...normalizeIdentity(asset),
      quote: normalizeAggregateQuote(
        asset,
        `data.rwa_assets[${assetIndex}]`,
        warnings,
      ),
      tokens: asset.tokens.map((token): RwaToken => ({
        cryptoId: token.crypto_id,
        name: token.name,
        symbol: token.symbol,
        issuerId: nullable(token.issuer_id),
        issuerName: nullable(token.issuer_name),
        currency: "USD",
        price: nullable(token.price),
        marketCap: nullable(token.market_cap),
        volume24h: nullable(token.volume_24h),
      })),
      tradfiMarkets: (asset.tradfi_markets ?? []).map(
        (market): TradfiMarket => ({
          exchangeId: market.exchange.exchange_id,
          exchangeName: market.exchange.name,
          exchangeSlug: market.exchange.slug,
          ticker: market.ticker,
          marketUrl: nullable(market.market_url),
        }),
      ),
    }),
  );

  return dataset(
    data,
    "/v5/real-world-assets/quotes/latest",
    response.status,
    warnings,
    context,
  );
}

export function normalizeRwaIssuersList(
  response: RwaIssuersListResponse,
  context: NormalizationContext = {},
): NormalizedDataset<Page<IssuerSummary>> {
  const warnings: WarningCollector = [];
  return dataset(
    {
      items: response.data.issuers.map(normalizeIssuerSummary),
      totalSize: response.data.total_size,
      hasMore: response.data.has_more,
    },
    "/v5/real-world-assets/issuers/list",
    response.status,
    warnings,
    context,
  );
}

export function normalizeRwaIssuer(
  response: RwaIssuerResponse,
  context: NormalizationContext = {},
): NormalizedDataset<IssuerDetail> {
  const warnings: WarningCollector = [];
  return dataset(
    {
      ...normalizeIssuerSummary(response.data),
      tokens: response.data.tokens.map((token) => ({
        cryptoId: token.crypto_id,
        rwaId: nullable(token.rwa_id),
        name: token.name,
        symbol: token.symbol,
      })),
      linkedTokenTotal: nullable(response.data.total_size),
      hasMore: nullable(response.data.has_more),
    },
    "/v5/real-world-assets/issuers",
    response.status,
    warnings,
    context,
  );
}

function validRwaAssets<T extends { rwa_id: number | null }>(
  assets: readonly T[],
  warnings: WarningCollector,
): Array<{ asset: T & { rwa_id: number }; index: number }> {
  const valid: Array<{
    asset: T & { rwa_id: number };
    index: number;
  }> = [];
  assets.forEach((asset, index) => {
    if (asset.rwa_id === null) {
      warnings.push({
        code: "INVALID_ASSET_EXCLUDED",
        path: `data.rwa_assets[${index}].rwa_id`,
        message: "An upstream asset without a canonical RWA ID was excluded",
      });
      return;
    }
    valid.push({
      asset: { ...asset, rwa_id: asset.rwa_id },
      index,
    });
  });
  return valid;
}

function normalizeIdentity(asset: ValidBaseAsset): AssetIdentity {
  return {
    rwaId: asset.rwa_id,
    name: asset.name,
    symbol: asset.symbol,
    slug: asset.slug,
    assetType: asset.asset_type,
    rank: nullable(asset.rwa_rank),
    hasTokens: nullable(asset.has_tokens),
  };
}

function normalizeAggregateQuote(
  asset: ListedApiAsset,
  path: string,
  warnings: WarningCollector,
): AggregateQuote {
  const usdQuote = asset.quotes?.find((quote) => quote.symbol === "USD");
  const hasTopLevelQuote =
    asset.average_tokenized_price !== undefined ||
    asset.tokenized_market_cap !== undefined ||
    asset.tokenized_volume_24h !== undefined;

  if (!usdQuote && !hasTopLevelQuote) {
    warnings.push({
      code: "USD_QUOTE_MISSING",
      path: `${path}.quotes`,
      message: "No aggregate USD quote was returned for this asset",
    });
  }

  return {
    currency: "USD",
    averageTokenizedPrice: preferDefined(
      asset.average_tokenized_price,
      usdQuote?.average_tokenized_price,
    ),
    tokenizedMarketCap: preferDefined(
      asset.tokenized_market_cap,
      usdQuote?.tokenized_market_cap,
    ),
    tokenizedVolume24h: preferDefined(
      asset.tokenized_volume_24h,
      usdQuote?.tokenized_volume_24h,
    ),
    sourceUpdatedAt: normalizeTimestamp(
      asset.last_updated === undefined
        ? usdQuote?.last_updated
        : asset.last_updated,
      `${path}.last_updated`,
      warnings,
    ),
  };
}

function normalizeIssuerSummary(
  issuer: RwaIssuersListResponse["data"]["issuers"][number],
): IssuerSummary {
  return {
    issuerId: issuer.issuer_id,
    name: issuer.name,
    website: nullable(issuer.website),
    logo: nullable(issuer.logo),
    tokenCount: nullable(issuer.num_tokens),
  };
}

function normalizeOptionalPagination(
  value: { total_size?: number; has_more?: boolean },
  path: string,
  warnings: WarningCollector,
): Pick<Page<never>, "totalSize" | "hasMore"> {
  if (value.total_size === undefined || value.has_more === undefined) {
    warnings.push({
      code: "PAGINATION_METADATA_MISSING",
      path,
      message: "Pagination metadata was not fully returned by CoinMarketCap",
    });
  }

  return {
    totalSize: nullable(value.total_size),
    hasMore: nullable(value.has_more),
  };
}

function dataset<T>(
  data: T,
  endpoint: CmcEndpoint,
  status: ApiStatus,
  warnings: WarningCollector,
  context: NormalizationContext,
): NormalizedDataset<T> {
  const observedAt = context.observedAt ?? new Date();
  if (!Number.isFinite(observedAt.getTime())) {
    throw new TypeError("observedAt must be a valid Date");
  }

  const evidenceWarnings: WarningCollector = [];
  const evidence: SourceEvidence = {
    provider: "coinmarketcap",
    endpoint,
    responseTimestamp: normalizeTimestamp(
      status.timestamp,
      "status.timestamp",
      evidenceWarnings,
    ),
    observedAt: observedAt.toISOString(),
    creditCount: status.credit_count,
    notice: nullable(status.notice),
  };

  return {
    data,
    evidence,
    warnings: [...warnings, ...evidenceWarnings],
  };
}

function normalizeTimestamp(
  value: string | null | undefined,
  path: string,
  warnings: WarningCollector,
): string | null {
  if (value === undefined || value === null) return null;
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    warnings.push({
      code: "INVALID_TIMESTAMP",
      path,
      message: "The source timestamp could not be normalized",
    });
    return null;
  }
  return timestamp.toISOString();
}

function preferDefined<T>(
  primary: T | null | undefined,
  fallback: T | null | undefined,
): T | null {
  if (primary !== undefined) return primary;
  return fallback ?? null;
}

function nullable<T>(value: T | null | undefined): T | null {
  return value ?? null;
}
