import { z } from "zod";

const nullableNumber = z.number().finite().nullable();
const nullableString = z.string().nullable();

export const assetTypeSchema = z.enum([
  "stock",
  "commodity",
  "currency",
  "government_security",
  "etf",
  "real_estate",
]);

const quoteSchema = z.object({
  currency: z.literal("USD"),
  averageTokenizedPrice: nullableNumber,
  tokenizedMarketCap: nullableNumber,
  tokenizedVolume24h: nullableNumber,
  sourceUpdatedAt: nullableString,
});

const assetSchema = z.object({
  rwaId: z.number().int().positive(),
  name: z.string(),
  symbol: z.string(),
  slug: z.string(),
  assetType: assetTypeSchema,
  rank: z.number().int().nonnegative().nullable(),
  hasTokens: z.boolean().nullable(),
  quote: quoteSchema,
});

const sourceStatusSchema = z.object({
  source: z.enum(["assets", "quotes", "marketPairs", "metadata"]),
  evidence: z.object({
    provider: z.literal("coinmarketcap"),
    endpoint: z.string(),
    responseTimestamp: nullableString,
    observedAt: z.string(),
    creditCount: z.number().nonnegative(),
    notice: nullableString,
  }),
  normalizationWarnings: z.array(
    z.object({ code: z.string(), path: z.string(), message: z.string() }),
  ),
  cache: z.object({
    state: z.enum(["fresh", "refreshed", "stale"]),
    observedAt: z.string(),
    expiresAt: z.string(),
    staleUntil: z.string(),
    warning: z.string().nullable(),
  }),
  refreshErrorCode: z.string().nullable(),
});

const explorerEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(assetSchema.extend({ turnoverRatio: nullableNumber })),
    pagination: z.object({
      totalSize: z.number().int().nonnegative().nullable(),
      hasMore: z.boolean().nullable(),
    }),
    sourceStatus: sourceStatusSchema,
    stale: z.boolean(),
  }),
  meta: z.object({
    requestId: z.string(),
    generatedAt: z.string(),
    stale: z.boolean().optional(),
  }),
});

const concentrationSchema = z.object({
  status: z.enum(["available", "unavailable"]),
  sampleSize: z.number().int().nonnegative(),
  totalVolume: z.number().nonnegative(),
  top1Share: nullableNumber,
  top3Share: nullableNumber,
  hhi: nullableNumber,
  normalizedHhi: nullableNumber,
});

const marketPairSchema = z.object({
  marketId: z.number().int().positive(),
  marketPair: z.string(),
  category: z.string(),
  feeType: nullableString,
  exchange: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    slug: z.string(),
  }),
  base: z.object({
    cryptoId: z.number().int().positive().nullable(),
    symbol: z.string(),
    exchangeSymbol: nullableString,
    currencyType: nullableString,
  }),
  quote: z.object({
    cryptoId: z.number().int().positive().nullable(),
    symbol: z.string(),
    exchangeSymbol: nullableString,
    currencyType: nullableString,
  }),
  marketQuote: z.object({
    currency: z.literal("USD"),
    price: nullableNumber,
    volume24h: nullableNumber,
    sourceUpdatedAt: nullableString,
  }),
});

const detailEnvelopeSchema = z.object({
  data: z.object({
    asset: assetSchema.extend({
      tokens: z.array(
        z.object({
          cryptoId: z.number().int().positive(),
          name: z.string(),
          symbol: z.string(),
          issuerId: nullableString,
          issuerName: nullableString,
          currency: z.literal("USD"),
          price: nullableNumber,
          marketCap: nullableNumber,
          volume24h: nullableNumber,
        }),
      ),
      tradfiMarkets: z.array(
        z.object({
          exchangeId: z.number().int().positive(),
          exchangeName: z.string(),
          exchangeSlug: z.string(),
          ticker: z.string(),
          marketUrl: nullableString,
        }),
      ),
    }),
    metadata: z
      .object({
        rwaId: z.number().int().positive(),
        website: nullableString,
        employees: nullableNumber,
        founded: nullableString,
        industry: nullableString,
        cik: nullableString,
        primaryExchange: nullableString,
        about: z
          .object({
            description: nullableString,
            logo: nullableString,
            website: nullableString,
            dateAdded: nullableString,
          })
          .nullable(),
      })
      .nullable(),
    marketPairs: z
      .object({
        rwaId: z.number().int().positive(),
        name: z.string(),
        symbol: z.string(),
        reportedPairCount: z.number().int().nonnegative(),
        pairs: z.array(marketPairSchema),
        totalSize: z.number().int().nonnegative(),
        hasMore: z.boolean(),
      })
      .nullable(),
    analysis: z.object({
      calculatedAt: z.string(),
      methodologyVersion: z.string(),
      metrics: z.object({
        turnoverRatio: nullableNumber,
        positionToVolumeRatio: nullableNumber,
        freshnessAgeMinutes: nullableNumber,
        freshnessScore: nullableNumber,
      }),
      concentration: z.object({
        market: concentrationSchema,
        exchange: concentrationSchema,
        token: concentrationSchema,
        issuer: concentrationSchema,
        issuerMappedVolumeCoverage: nullableNumber,
      }),
      priceDispersion: z.object({
        status: z.enum(["available", "unavailable"]),
        sampleSize: z.number().int().nonnegative(),
        weightedMeanPrice: nullableNumber,
        weightedAbsoluteDeviation: nullableNumber,
        robustWeightedMeanPrice: nullableNumber,
        robustWeightedAbsoluteDeviation: nullableNumber,
        medianPrice: nullableNumber,
        medianAbsoluteDeviation: nullableNumber,
        observations: z.array(
          z.object({
            marketId: z.number().int().positive(),
            marketPair: z.string(),
            price: z.number().finite(),
            volume24h: z.number().finite().nonnegative(),
            isOutlier: z.boolean(),
          }),
        ),
      }),
      evidenceCoverage: z.object({
        score: z.number().min(0).max(100),
        label: z.enum(["Limited", "Moderate", "High"]),
        factors: z.array(
          z.object({
            key: z.string(),
            weight: z.number(),
            earned: z.number(),
            passed: z.boolean(),
          }),
        ),
      }),
      marketCapacityHealth: z.object({
        score: nullableNumber,
        availableWeight: z.number(),
        coverage: z.number().min(0).max(1),
        status: z.enum(["available", "insufficient_evidence"]),
        components: z.array(
          z.object({
            key: z.string(),
            score: nullableNumber,
            weight: z.number(),
            available: z.boolean(),
          }),
        ),
      }),
      warnings: z.array(
        z.object({
          code: z.string(),
          message: z.string(),
          path: z.string().optional(),
        }),
      ),
    }),
    sourceStatuses: z.array(sourceStatusSchema),
    dataGaps: z.array(
      z.object({
        source: z.enum(["assets", "marketPairs", "metadata"]),
        code: z.enum(["SOURCE_UNAVAILABLE", "ASSET_NOT_RETURNED"]),
      }),
    ),
    stale: z.boolean(),
  }),
  meta: z.object({
    requestId: z.string(),
    generatedAt: z.string(),
    stale: z.boolean().optional(),
  }),
});

const exitScenarioSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("available"),
    effectiveVolume: z.number().finite(),
    dailyCapacity: z.number().finite(),
    estimatedExitDays: z.number().finite(),
    positionToVolumeRatio: z.number().finite(),
  }),
  z.object({
    status: z.literal("unavailable"),
    reason: z.string(),
  }),
]);

const compareEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(
      z.object({
        asset: assetSchema,
        analysis: z.object({
          scenario: exitScenarioSchema,
          metrics: z.object({
            turnoverRatio: nullableNumber,
            freshnessAgeMinutes: nullableNumber,
          }),
          concentration: z.object({
            market: concentrationSchema,
            exchange: concentrationSchema,
            token: concentrationSchema,
            issuer: concentrationSchema,
            issuerMappedVolumeCoverage: nullableNumber,
          }),
          evidenceCoverage: z.object({
            score: z.number().min(0).max(100),
            label: z.enum(["Limited", "Moderate", "High"]),
          }),
          marketCapacityHealth: z.object({
            score: nullableNumber,
            status: z.enum(["available", "insufficient_evidence"]),
          }),
        }),
        dataGaps: z.array(z.object({ source: z.string(), code: z.string() })),
        stale: z.boolean(),
      }),
    ),
    failures: z.array(
      z.object({
        rwaId: z.number().int().positive(),
        code: z.enum(["ASSET_NOT_FOUND", "REQUIRED_SOURCE_UNAVAILABLE"]),
      }),
    ),
    scenario: z.object({
      positionValue: z.number().finite().positive(),
      participationRate: z.number().min(0.001).max(0.2),
      stressHaircut: z.number().min(0).max(0.9),
    }),
    stale: z.boolean(),
  }),
  meta: z.object({
    requestId: z.string(),
    generatedAt: z.string(),
    stale: z.boolean().optional(),
  }),
});

const failureSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
});

export type AssetType = z.infer<typeof assetTypeSchema>;
export type ExplorerResponse = z.infer<typeof explorerEnvelopeSchema>["data"];
export type ExplorerItem = ExplorerResponse["items"][number];
export type AssetDetailResponse = z.infer<typeof detailEnvelopeSchema>["data"];
export type CompareResponse = z.infer<typeof compareEnvelopeSchema>["data"];

export class RwaApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super("RWA data could not be loaded");
    this.name = "RwaApiError";
  }
}

export async function getExplorer(input: {
  assetType?: AssetType;
  sort?:
    | "rwa_rank"
    | "tokenized_market_cap"
    | "tokenized_volume_24h"
    | "average_tokenized_price"
    | "symbol";
  sortDir?: "asc" | "desc";
  start?: number;
  limit?: number;
}): Promise<ExplorerResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const response = await fetch(`/api/assets?${query.toString()}`, {
    headers: { Accept: "application/json" },
  });
  return parseResponse(response, explorerEnvelopeSchema);
}

export async function getAssetDetail(
  rwaId: number,
): Promise<AssetDetailResponse> {
  const response = await fetch(`/api/assets/${rwaId}`, {
    headers: { Accept: "application/json" },
  });
  return parseResponse(response, detailEnvelopeSchema);
}

export async function compareAssets(input: {
  rwaIds: number[];
  positionValue: number;
  participationRate: number;
  stressHaircut: number;
}): Promise<CompareResponse> {
  const response = await fetch("/api/compare", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return parseResponse(response, compareEnvelopeSchema);
}

async function parseResponse<TData>(
  response: Response,
  schema: z.ZodType<{ data: TData }>,
): Promise<TData> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = failureSchema.safeParse(body);
    throw new RwaApiError(
      failure.success ? failure.data.error.code : "INVALID_RESPONSE",
      response.status,
      failure.success && failure.data.error.retryable,
    );
  }
  return schema.parse(body).data;
}
