import { z } from "zod";

export const rwaAssetTypeSchema = z.enum([
  "stock",
  "commodity",
  "currency",
  "government_security",
  "etf",
  "real_estate",
]);

const nullableNumber = z.number().finite().nullable().optional();
const nullableString = z.string().nullable().optional();

export const cmcStatusSchema = z
  .object({
    timestamp: z.string(),
    error_code: z.coerce.number().int(),
    error_message: z.string().nullable(),
    elapsed: z.number(),
    credit_count: z.number().nonnegative(),
    notice: z.string().nullable().optional(),
  })
  .passthrough();

const quoteSchema = z
  .object({
    symbol: z.string(),
    crypto_id: z.number().int().optional(),
    average_tokenized_price: nullableNumber,
    tokenized_market_cap: nullableNumber,
    tokenized_volume_24h: nullableNumber,
    price: nullableNumber,
    volume_24h: nullableNumber,
    volume_24h_base: nullableNumber,
    volume_24h_quote: nullableNumber,
    last_updated: nullableString,
  })
  .passthrough();

const rwaAssetBaseSchema = z
  .object({
    rwa_id: z.number().int().positive().nullable(),
    name: z.string(),
    symbol: z.string(),
    slug: z.string(),
    asset_type: rwaAssetTypeSchema,
    rwa_rank: z.number().int().nonnegative().nullable().optional(),
    has_tokens: z.boolean().nullable().optional(),
  })
  .passthrough();

const rwaMapAssetSchema = rwaAssetBaseSchema.extend({
  first_historical_data: nullableString,
  last_historical_data: nullableString,
});

const rwaInfoAssetSchema = rwaAssetBaseSchema.extend({
  website: nullableString,
  employees: nullableNumber,
  founded: nullableString,
  industry: nullableString,
  cik: nullableString,
  primary_exchange: nullableString,
  about: z
    .object({
      description: nullableString,
      logo: nullableString,
      website: nullableString,
      date_added: nullableString,
    })
    .passthrough()
    .nullable()
    .optional(),
});

const rwaListedAssetSchema = rwaAssetBaseSchema.extend({
  average_tokenized_price: nullableNumber,
  tokenized_market_cap: nullableNumber,
  tokenized_volume_24h: nullableNumber,
  last_updated: nullableString,
  quotes: z.array(quoteSchema).optional(),
});

const rwaTokenSchema = z
  .object({
    crypto_id: z.number().int().positive(),
    name: nullableString,
    symbol: nullableString,
    issuer_id: nullableString,
    issuer_name: nullableString,
    price: nullableNumber,
    market_cap: nullableNumber,
    volume_24h: nullableNumber,
  })
  .passthrough();

const exchangeSchema = z
  .object({
    exchange_id: z.number().int().positive(),
    name: z.string(),
    slug: z.string(),
  })
  .passthrough();

const marketCurrencySchema = z
  .object({
    crypto_id: z.number().int().optional(),
    symbol: z.string(),
    exchange_symbol: z.string().optional(),
    currency_type: z.string().optional(),
  })
  .passthrough();

const marketPairSchema = z
  .object({
    exchange: exchangeSchema,
    market_id: z.number().int().positive(),
    market_pair: z.string(),
    category: z.string(),
    fee_type: nullableString,
    market_pair_base: marketCurrencySchema,
    market_pair_quote: marketCurrencySchema,
    exchange_reported_quotes: z.array(quoteSchema).optional(),
    quotes: z.array(quoteSchema),
  })
  .passthrough();

const tradfiMarketSchema = z
  .object({
    exchange: exchangeSchema,
    ticker: z.string(),
    market_url: nullableString,
  })
  .passthrough();

const rwaQuoteAssetSchema = rwaListedAssetSchema.extend({
  tokens: z.array(rwaTokenSchema),
  tradfi_markets: z.array(tradfiMarketSchema).optional(),
});

const issuerSummarySchema = z
  .object({
    issuer_id: z.string().regex(/^[0-9a-f]{24}$/),
    name: z.string(),
    website: nullableString,
    logo: nullableString,
    num_tokens: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const issuerTokenSchema = z
  .object({
    crypto_id: z.number().int().positive(),
    name: z.string(),
    symbol: z.string(),
    rwa_id: z.number().int().positive().nullable().optional(),
  })
  .passthrough();

export const rwaMapResponseSchema = z.object({
  data: z
    .object({
      rwa_assets: z.array(rwaMapAssetSchema),
      total_size: z.number().int().nonnegative().optional(),
      has_more: z.boolean().optional(),
    })
    .passthrough(),
  status: cmcStatusSchema,
});

export const rwaInfoResponseSchema = z.object({
  data: z.object({ rwa_assets: z.array(rwaInfoAssetSchema) }).passthrough(),
  status: cmcStatusSchema,
});

export const rwaAssetsListResponseSchema = z.object({
  data: z
    .object({
      rwa_assets: z.array(rwaListedAssetSchema),
      total_size: z.number().int().nonnegative().optional(),
      has_more: z.boolean().optional(),
    })
    .passthrough(),
  status: cmcStatusSchema,
});

export const rwaMarketPairsResponseSchema = z.object({
  data: z
    .object({
      rwa_id: z.number().int().positive(),
      name: z.string(),
      symbol: z.string(),
      num_market_pairs: z.number().int().nonnegative(),
      market_pairs: z.array(marketPairSchema),
      total_size: z.number().int().nonnegative(),
      has_more: z.boolean(),
    })
    .passthrough(),
  status: cmcStatusSchema,
});

export const rwaQuotesLatestResponseSchema = z.object({
  data: z.object({ rwa_assets: z.array(rwaQuoteAssetSchema) }).passthrough(),
  status: cmcStatusSchema,
});

export const rwaIssuersListResponseSchema = z.object({
  data: z
    .object({
      issuers: z.array(issuerSummarySchema),
      total_size: z.number().int().nonnegative(),
      has_more: z.boolean(),
    })
    .passthrough(),
  status: cmcStatusSchema,
});

export const rwaIssuerResponseSchema = z.object({
  data: issuerSummarySchema
    .extend({
      tokens: z.array(issuerTokenSchema),
      total_size: z.number().int().nonnegative().optional(),
      has_more: z.boolean().optional(),
    })
    .passthrough(),
  status: cmcStatusSchema,
});

export type RwaAssetType = z.infer<typeof rwaAssetTypeSchema>;
export type RwaMapResponse = z.infer<typeof rwaMapResponseSchema>;
export type RwaInfoResponse = z.infer<typeof rwaInfoResponseSchema>;
export type RwaAssetsListResponse = z.infer<typeof rwaAssetsListResponseSchema>;
export type RwaMarketPairsResponse = z.infer<
  typeof rwaMarketPairsResponseSchema
>;
export type RwaQuotesLatestResponse = z.infer<
  typeof rwaQuotesLatestResponseSchema
>;
export type RwaIssuersListResponse = z.infer<
  typeof rwaIssuersListResponseSchema
>;
export type RwaIssuerResponse = z.infer<typeof rwaIssuerResponseSchema>;
