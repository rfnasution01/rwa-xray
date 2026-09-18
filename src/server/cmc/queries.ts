import { z } from "zod";

import { rwaAssetTypeSchema } from "./schemas";

const idList = z.string().regex(/^\d+(?:,\d+)*$/);
const idSingle = z.string().regex(/^\d+$/);
const slugList = z.string().regex(/^[0-9a-z-]+(?:,[0-9a-z-]+)*$/);
const slugSingle = z.string().regex(/^[0-9a-z-]+$/);
const symbolList = z.string().regex(/^[0-9A-Za-z$@-]+(?:,[0-9A-Za-z$@-]+)*$/);
const symbolSingle = z.string().regex(/^[0-9A-Za-z$@-]+$/);
const issuerId = z.string().regex(/^[0-9a-f]{24}$/);
const issuerIdList = z.string().regex(/^[0-9a-f]{24}(?:,[0-9a-f]{24})*$/);
const pagination = {
  start: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(250).optional(),
};
const usdConversion = {
  convert: z.literal("USD").optional().default("USD"),
};

function requireExactlyOneIdentifier(
  value: { rwaId?: string; rwaSlug?: string; symbol?: string },
  context: z.RefinementCtx,
) {
  const count = [value.rwaId, value.rwaSlug, value.symbol].filter(
    Boolean,
  ).length;
  if (count !== 1) {
    context.addIssue({
      code: "custom",
      message: "Exactly one of rwaId, rwaSlug, or symbol is required",
    });
  }
}

function allowAtMostOneIdentifier(
  value: { rwaId?: string; rwaSlug?: string; symbol?: string },
  context: z.RefinementCtx,
) {
  const count = [value.rwaId, value.rwaSlug, value.symbol].filter(
    Boolean,
  ).length;
  if (count > 1) {
    context.addIssue({
      code: "custom",
      message: "Only one of rwaId, rwaSlug, or symbol may be provided",
    });
  }
}

export const mapQuerySchema = z.object({
  assetType: rwaAssetTypeSchema.optional(),
  symbol: symbolList.optional(),
  sort: z.enum(["rwa_id", "rwa_rank", "name"]).optional(),
  start: pagination.start,
  limit: z.number().int().min(1).max(250).optional(),
});

export const infoQuerySchema = z
  .object({
    rwaId: idList.optional(),
    rwaSlug: slugList.optional(),
    symbol: symbolList.optional(),
    skipInvalid: z.boolean().optional(),
  })
  .superRefine(requireExactlyOneIdentifier);

export const assetsListQuerySchema = z
  .object({
    rwaId: idList.optional(),
    rwaSlug: slugList.optional(),
    symbol: symbolList.optional(),
    assetType: rwaAssetTypeSchema.optional(),
    sort: z
      .enum([
        "rwa_rank",
        "tokenized_market_cap",
        "tokenized_volume_24h",
        "average_tokenized_price",
        "symbol",
      ])
      .optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
    ...pagination,
    ...usdConversion,
    skipInvalid: z.boolean().optional(),
  })
  .superRefine(allowAtMostOneIdentifier);

export const marketPairsQuerySchema = z
  .object({
    rwaId: idSingle.optional(),
    rwaSlug: slugSingle.optional(),
    symbol: symbolSingle.optional(),
    sort: z.enum(["volume_24h", "price"]).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
    ...pagination,
    ...usdConversion,
  })
  .superRefine(requireExactlyOneIdentifier);

export const quotesLatestQuerySchema = z
  .object({
    rwaId: idList.optional(),
    rwaSlug: slugList.optional(),
    symbol: symbolList.optional(),
    ...usdConversion,
    skipInvalid: z.boolean().optional(),
  })
  .superRefine(requireExactlyOneIdentifier);

export const issuersListQuerySchema = z.object({
  issuerId: issuerIdList.optional(),
  active: z.boolean().optional(),
  ...pagination,
  skipInvalid: z.boolean().optional(),
});

export const issuerQuerySchema = z.object({
  issuerId,
  ...pagination,
});

export type MapQuery = z.input<typeof mapQuerySchema>;
export type InfoQuery = z.input<typeof infoQuerySchema>;
export type AssetsListQuery = z.input<typeof assetsListQuerySchema>;
export type MarketPairsQuery = z.input<typeof marketPairsQuerySchema>;
export type QuotesLatestQuery = z.input<typeof quotesLatestQuerySchema>;
export type IssuersListQuery = z.input<typeof issuersListQuerySchema>;
export type IssuerQuery = z.input<typeof issuerQuerySchema>;

const queryKeyMap: Record<string, string> = {
  assetType: "asset_type",
  rwaId: "rwa_id",
  rwaSlug: "rwa_slug",
  sortDir: "sort_dir",
  skipInvalid: "skip_invalid",
  issuerId: "issuer_id",
};

export function serializeQuery(
  query: Record<string, unknown>,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of Object.keys(query).sort()) {
    const value = query[key];
    if (value === undefined || value === null || value === false) continue;
    params.set(queryKeyMap[key] ?? key, String(value));
  }

  return params;
}
