import { z } from "zod";

export const explorerRequestSchema = z
  .object({
    assetType: z
      .enum([
        "stock",
        "commodity",
        "currency",
        "government_security",
        "etf",
        "real_estate",
      ])
      .optional(),
    sort: z
      .enum([
        "rwa_rank",
        "tokenized_market_cap",
        "tokenized_volume_24h",
        "average_tokenized_price",
        "symbol",
      ])
      .default("rwa_rank"),
    sortDir: z.enum(["asc", "desc"]).default("asc"),
    start: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(250).default(100),
  })
  .strict();

const scenarioFields = {
  positionValue: z
    .number()
    .finite()
    .positive()
    .max(1_000_000_000)
    .default(100_000),
  participationRate: z.number().finite().min(0.001).max(0.2).default(0.05),
  stressHaircut: z.number().finite().min(0).max(0.9).default(0),
};

export const compareRequestSchema = z
  .object({
    rwaIds: z
      .array(z.number().int().positive())
      .min(2)
      .max(4)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "RWA identifiers must be unique",
      }),
    ...scenarioFields,
  })
  .strict();

export const detailRequestSchema = z
  .object({
    rwaId: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().positive()),
    positionValue: z.coerce
      .number()
      .finite()
      .positive()
      .max(1_000_000_000)
      .default(100_000),
    participationRate: z.coerce
      .number()
      .finite()
      .min(0.001)
      .max(0.2)
      .default(0.05),
    stressHaircut: z.coerce.number().finite().min(0).max(0.9).default(0),
  })
  .strict();

export function searchParamsToObject(searchParams: URLSearchParams) {
  const output: Record<string, string> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    if (values.length !== 1) {
      throw new DuplicateQueryParameterError(key);
    }
    output[key] = values[0]!;
  }
  return output;
}

export class InvalidRequestBodyError extends Error {
  constructor() {
    super("The request body must be valid application/json under 4 KB");
    this.name = "InvalidRequestBodyError";
  }
}

export class DuplicateQueryParameterError extends Error {
  constructor(readonly parameter: string) {
    super(`Duplicate query parameter: ${parameter}`);
    this.name = "DuplicateQueryParameterError";
  }
}
