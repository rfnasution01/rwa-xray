import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { AnalysisResult } from "@/domain/analysis";
import type { AssetMetadata, IssuerSummary } from "@/domain/assets/models";

export const cmcCacheEntries = pgTable(
  "cmc_cache_entries",
  {
    cacheKey: text("cache_key").primaryKey(),
    endpoint: text("endpoint").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    staleUntil: timestamp("stale_until", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cmc_cache_entries_expires_at_idx").on(table.expiresAt),
    index("cmc_cache_entries_stale_until_idx").on(table.staleUntil),
  ],
);

export const rwaAssets = pgTable(
  "rwa_assets",
  {
    rwaId: integer("rwa_id").primaryKey(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    slug: text("slug").notNull(),
    assetType: text("asset_type").notNull(),
    rank: integer("rwa_rank"),
    hasTokens: boolean("has_tokens"),
    firstHistoricalData: timestamp("first_historical_data", {
      withTimezone: true,
    }),
    lastHistoricalData: timestamp("last_historical_data", {
      withTimezone: true,
    }),
    metadata: jsonb("metadata_json").$type<AssetMetadata | null>(),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("rwa_assets_asset_type_rank_idx").on(table.assetType, table.rank),
  ],
);

export const rwaQuotes = pgTable(
  "rwa_quotes",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    rwaId: integer("rwa_id")
      .notNull()
      .references(() => rwaAssets.rwaId),
    currency: text("currency").notNull().default("USD"),
    averageTokenizedPrice: numeric("average_tokenized_price"),
    tokenizedMarketCap: numeric("tokenized_market_cap"),
    tokenizedVolume24h: numeric("tokenized_volume_24h"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    observedAt: timestamp("observed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("rwa_quotes_rwa_observed_uidx").on(
      table.rwaId,
      table.observedAt,
    ),
    index("rwa_quotes_rwa_observed_idx").on(table.rwaId, table.observedAt),
  ],
);

export const rwaTokens = pgTable(
  "rwa_tokens",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    rwaId: integer("rwa_id")
      .notNull()
      .references(() => rwaAssets.rwaId),
    cryptoId: integer("crypto_id").notNull(),
    issuerId: text("issuer_id"),
    issuerName: text("issuer_name"),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    currency: text("currency").notNull().default("USD"),
    price: numeric("price"),
    marketCap: numeric("market_cap"),
    volume24h: numeric("volume_24h"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("rwa_tokens_asset_crypto_observed_uidx").on(
      table.rwaId,
      table.cryptoId,
      table.observedAt,
    ),
    index("rwa_tokens_rwa_observed_idx").on(table.rwaId, table.observedAt),
  ],
);

export const rwaMarketPairs = pgTable(
  "rwa_market_pairs",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    rwaId: integer("rwa_id")
      .notNull()
      .references(() => rwaAssets.rwaId),
    marketId: integer("market_id").notNull(),
    exchangeId: integer("exchange_id").notNull(),
    exchangeName: text("exchange_name").notNull(),
    marketPair: text("market_pair").notNull(),
    category: text("category").notNull(),
    currency: text("currency").notNull().default("USD"),
    price: numeric("price"),
    volume24h: numeric("volume_24h"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("rwa_pairs_asset_market_observed_uidx").on(
      table.rwaId,
      table.marketId,
      table.observedAt,
    ),
    index("rwa_pairs_rwa_observed_idx").on(table.rwaId, table.observedAt),
  ],
);

export const issuers = pgTable("issuers", {
  issuerId: text("issuer_id").primaryKey(),
  name: text("name").notNull(),
  payload: jsonb("payload_json").$type<IssuerSummary>().notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const analysisSnapshots = pgTable(
  "analysis_snapshots",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    rwaId: integer("rwa_id")
      .notNull()
      .references(() => rwaAssets.rwaId),
    methodologyVersion: text("methodology_version").notNull(),
    configurationHash: text("configuration_hash").notNull(),
    inputSnapshotIds: text("input_snapshot_ids").array().notNull(),
    metrics: jsonb("metrics_json").$type<AnalysisResult>().notNull(),
    score: numeric("score"),
    confidence: numeric("confidence").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("analysis_snapshots_asset_calculated_uidx").on(
      table.rwaId,
      table.calculatedAt,
    ),
    index("analysis_snapshots_rwa_calculated_idx").on(
      table.rwaId,
      table.calculatedAt,
    ),
  ],
);

export const assetActivity = pgTable(
  "asset_activity",
  {
    rwaId: integer("rwa_id")
      .primaryKey()
      .references(() => rwaAssets.rwaId),
    viewCount: integer("view_count").notNull().default(1),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("asset_activity_last_viewed_idx").on(table.lastViewedAt)],
);
