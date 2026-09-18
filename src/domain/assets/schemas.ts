import { z } from "zod";

const nullableFiniteNumber = z.number().finite().nullable();
const nullableString = z.string().nullable();
const nullableTimestamp = z.iso.datetime({ offset: true }).nullable();

export const assetTypeSchema = z.enum([
  "stock",
  "commodity",
  "currency",
  "government_security",
  "etf",
  "real_estate",
]);

export const assetIdentitySchema = z.object({
  rwaId: z.number().int().positive(),
  name: z.string(),
  symbol: z.string(),
  slug: z.string(),
  assetType: assetTypeSchema,
  rank: z.number().int().nonnegative().nullable(),
  hasTokens: z.boolean().nullable(),
});

export const discoveryAssetSchema = assetIdentitySchema.extend({
  firstHistoricalData: nullableTimestamp,
  lastHistoricalData: nullableTimestamp,
});

export const assetMetadataSchema = assetIdentitySchema.extend({
  website: nullableString,
  employees: nullableFiniteNumber,
  founded: nullableString,
  industry: nullableString,
  cik: nullableString,
  primaryExchange: nullableString,
  about: z
    .object({
      description: nullableString,
      logo: nullableString,
      website: nullableString,
      dateAdded: nullableTimestamp,
    })
    .nullable(),
});

export const aggregateQuoteSchema = z.object({
  currency: z.literal("USD"),
  averageTokenizedPrice: nullableFiniteNumber,
  tokenizedMarketCap: nullableFiniteNumber,
  tokenizedVolume24h: nullableFiniteNumber,
  sourceUpdatedAt: nullableTimestamp,
});

export const listedAssetSchema = assetIdentitySchema.extend({
  quote: aggregateQuoteSchema,
});

export const rwaTokenSchema = z.object({
  cryptoId: z.number().int().positive(),
  name: z.string(),
  symbol: z.string(),
  issuerId: nullableString,
  issuerName: nullableString,
  currency: z.literal("USD"),
  price: nullableFiniteNumber,
  marketCap: nullableFiniteNumber,
  volume24h: nullableFiniteNumber,
});

export const tradfiMarketSchema = z.object({
  exchangeId: z.number().int().positive(),
  exchangeName: z.string(),
  exchangeSlug: z.string(),
  ticker: z.string(),
  marketUrl: nullableString,
});

export const detailedAssetSchema = assetIdentitySchema.extend({
  quote: aggregateQuoteSchema,
  tokens: z.array(rwaTokenSchema),
  tradfiMarkets: z.array(tradfiMarketSchema),
});

const pairCurrencySchema = z.object({
  cryptoId: z.number().int().positive().nullable(),
  symbol: z.string(),
  exchangeSymbol: nullableString,
  currencyType: nullableString,
});

export const marketPairSchema = z.object({
  marketId: z.number().int().positive(),
  marketPair: z.string(),
  category: z.string(),
  feeType: nullableString,
  exchange: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    slug: z.string(),
  }),
  base: pairCurrencySchema,
  quote: pairCurrencySchema,
  marketQuote: z.object({
    currency: z.literal("USD"),
    price: nullableFiniteNumber,
    volume24h: nullableFiniteNumber,
    sourceUpdatedAt: nullableTimestamp,
  }),
});

export const marketPairsSchema = z.object({
  rwaId: z.number().int().positive(),
  name: z.string(),
  symbol: z.string(),
  reportedPairCount: z.number().int().nonnegative(),
  pairs: z.array(marketPairSchema),
  totalSize: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const issuerSummarySchema = z.object({
  issuerId: z.string().regex(/^[0-9a-f]{24}$/),
  name: z.string(),
  website: nullableString,
  logo: nullableString,
  tokenCount: z.number().int().nonnegative().nullable(),
});

export const issuerDetailSchema = issuerSummarySchema.extend({
  tokens: z.array(
    z.object({
      cryptoId: z.number().int().positive(),
      rwaId: z.number().int().positive(),
      name: z.string(),
      symbol: z.string(),
    }),
  ),
  linkedTokenTotal: z.number().int().nonnegative().nullable(),
  hasMore: z.boolean().nullable(),
});

const warningSchema = z.object({
  code: z.enum([
    "INVALID_ASSET_EXCLUDED",
    "INVALID_TIMESTAMP",
    "USD_QUOTE_MISSING",
    "PAGINATION_METADATA_MISSING",
  ]),
  path: z.string(),
  message: z.string(),
});

const endpointSchema = z.enum([
  "/v5/real-world-assets/map",
  "/v5/real-world-assets/info",
  "/v5/real-world-assets/assets/list",
  "/v5/real-world-assets/market-pairs/list",
  "/v5/real-world-assets/quotes/latest",
  "/v5/real-world-assets/issuers/list",
  "/v5/real-world-assets/issuers",
]);

const evidenceSchema = z.object({
  provider: z.literal("coinmarketcap"),
  endpoint: endpointSchema,
  responseTimestamp: nullableTimestamp,
  observedAt: z.iso.datetime({ offset: true }),
  creditCount: z.number().nonnegative(),
  notice: nullableString,
});

function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    totalSize: z.number().int().nonnegative().nullable(),
    hasMore: z.boolean().nullable(),
  });
}

function normalizedDatasetSchema<T extends z.ZodType>(data: T) {
  return z.object({
    data,
    evidence: evidenceSchema,
    warnings: z.array(warningSchema),
  });
}

export const normalizedMapDatasetSchema = normalizedDatasetSchema(
  pageSchema(discoveryAssetSchema),
);
export const normalizedInfoDatasetSchema = normalizedDatasetSchema(
  z.array(assetMetadataSchema),
);
export const normalizedAssetsListDatasetSchema = normalizedDatasetSchema(
  pageSchema(listedAssetSchema),
);
export const normalizedMarketPairsDatasetSchema =
  normalizedDatasetSchema(marketPairsSchema);
export const normalizedQuotesLatestDatasetSchema = normalizedDatasetSchema(
  z.array(detailedAssetSchema),
);
export const normalizedIssuersListDatasetSchema = normalizedDatasetSchema(
  pageSchema(issuerSummarySchema),
);
export const normalizedIssuerDatasetSchema =
  normalizedDatasetSchema(issuerDetailSchema);
