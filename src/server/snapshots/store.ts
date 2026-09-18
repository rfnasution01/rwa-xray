import "server-only";

import { desc, gte, sql } from "drizzle-orm";

import type { AnalysisResult } from "@/domain/analysis";
import type {
  DetailedAsset,
  ListedAsset,
  MarketPairs,
} from "@/domain/assets/models";
import { getDatabase } from "@/server/db";
import {
  analysisSnapshots,
  assetActivity,
  rwaAssets,
  rwaMarketPairs,
  rwaQuotes,
  rwaTokens,
} from "@/server/db/schema";

export type AssetSnapshot = {
  asset: DetailedAsset;
  marketPairs: MarketPairs | null;
  analysis: AnalysisResult;
  observedAt: Date;
  pairObservedAt: Date | null;
};

export type SnapshotStore = {
  upsertAssets(assets: readonly ListedAsset[], observedAt: Date): Promise<void>;
  getRecentlyViewedAssetIds(options: {
    since: Date;
    limit: number;
  }): Promise<number[]>;
  saveAssetSnapshot(snapshot: AssetSnapshot): Promise<void>;
};

export function createPostgresSnapshotStore(
  database: ReturnType<typeof getDatabase> = getDatabase(),
): SnapshotStore {
  return {
    async upsertAssets(assets, observedAt) {
      if (assets.length === 0) return;
      await database
        .insert(rwaAssets)
        .values(assets.map((asset) => assetValues(asset, observedAt)))
        .onConflictDoUpdate({
          target: rwaAssets.rwaId,
          set: {
            name: sql.raw('excluded."name"'),
            symbol: sql.raw('excluded."symbol"'),
            slug: sql.raw('excluded."slug"'),
            assetType: sql.raw('excluded."asset_type"'),
            rank: sql.raw('excluded."rwa_rank"'),
            hasTokens: sql.raw('excluded."has_tokens"'),
            sourceUpdatedAt: sql.raw('excluded."source_updated_at"'),
            syncedAt: observedAt,
          },
        });
    },

    async getRecentlyViewedAssetIds({ since, limit }) {
      const rows = await database
        .select({ rwaId: assetActivity.rwaId })
        .from(assetActivity)
        .where(gte(assetActivity.lastViewedAt, since))
        .orderBy(desc(assetActivity.lastViewedAt))
        .limit(limit);
      return rows.map((row) => row.rwaId);
    },

    async saveAssetSnapshot(snapshot) {
      const { asset, marketPairs, analysis, observedAt, pairObservedAt } =
        snapshot;
      await database.transaction(async (transaction) => {
        await transaction
          .insert(rwaAssets)
          .values(assetValues(asset, observedAt))
          .onConflictDoUpdate({
            target: rwaAssets.rwaId,
            set: {
              name: asset.name,
              symbol: asset.symbol,
              slug: asset.slug,
              assetType: asset.assetType,
              rank: asset.rank,
              hasTokens: asset.hasTokens,
              sourceUpdatedAt: toDate(asset.quote.sourceUpdatedAt),
              syncedAt: observedAt,
            },
          });

        await transaction
          .insert(rwaQuotes)
          .values({
            rwaId: asset.rwaId,
            currency: asset.quote.currency,
            averageTokenizedPrice: decimal(asset.quote.averageTokenizedPrice),
            tokenizedMarketCap: decimal(asset.quote.tokenizedMarketCap),
            tokenizedVolume24h: decimal(asset.quote.tokenizedVolume24h),
            sourceUpdatedAt: toDate(asset.quote.sourceUpdatedAt),
            observedAt,
          })
          .onConflictDoNothing();

        if (asset.tokens.length > 0) {
          await transaction
            .insert(rwaTokens)
            .values(
              asset.tokens.map((token) => ({
                rwaId: asset.rwaId,
                cryptoId: token.cryptoId,
                issuerId: token.issuerId,
                issuerName: token.issuerName,
                name: token.name,
                symbol: token.symbol,
                currency: token.currency,
                price: decimal(token.price),
                marketCap: decimal(token.marketCap),
                volume24h: decimal(token.volume24h),
                observedAt,
              })),
            )
            .onConflictDoNothing();
        }

        if (marketPairs && marketPairs.pairs.length > 0) {
          await transaction
            .insert(rwaMarketPairs)
            .values(
              marketPairs.pairs.map((pair) => ({
                rwaId: asset.rwaId,
                marketId: pair.marketId,
                exchangeId: pair.exchange.id,
                exchangeName: pair.exchange.name,
                marketPair: pair.marketPair,
                category: pair.category,
                currency: pair.marketQuote.currency,
                price: decimal(pair.marketQuote.price),
                volume24h: decimal(pair.marketQuote.volume24h),
                sourceUpdatedAt: toDate(pair.marketQuote.sourceUpdatedAt),
                observedAt: pairObservedAt ?? observedAt,
              })),
            )
            .onConflictDoNothing();
        }

        await transaction
          .insert(analysisSnapshots)
          .values({
            rwaId: asset.rwaId,
            methodologyVersion: analysis.methodologyVersion,
            configurationHash: analysis.configurationHash,
            inputSnapshotIds: analysis.inputSnapshotIds,
            metrics: analysis,
            score: decimal(analysis.marketCapacityHealth.score),
            confidence: decimal(analysis.evidenceCoverage.score)!,
            calculatedAt: new Date(analysis.calculatedAt),
          })
          .onConflictDoNothing();
      });
    },
  };
}

function assetValues(asset: ListedAsset | DetailedAsset, syncedAt: Date) {
  return {
    rwaId: asset.rwaId,
    name: asset.name,
    symbol: asset.symbol,
    slug: asset.slug,
    assetType: asset.assetType,
    rank: asset.rank,
    hasTokens: asset.hasTokens,
    sourceUpdatedAt: toDate(asset.quote.sourceUpdatedAt),
    syncedAt,
  };
}

function decimal(value: number | null): string | null {
  return value === null ? null : String(value);
}

function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}
