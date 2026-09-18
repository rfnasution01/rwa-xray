import "server-only";

import { sql } from "drizzle-orm";

import type { DetailedAsset } from "@/domain/assets/models";
import { getDatabase } from "@/server/db";
import { assetActivity, rwaAssets } from "@/server/db/schema";

export type AssetActivityRecorder = {
  recordView(asset: DetailedAsset): Promise<void>;
};

export function createAssetActivityRecorder(
  database: ReturnType<typeof getDatabase> = getDatabase(),
): AssetActivityRecorder {
  return {
    async recordView(asset) {
      const viewedAt = new Date();
      await database.transaction(async (transaction) => {
        await transaction
          .insert(rwaAssets)
          .values(assetValues(asset, viewedAt))
          .onConflictDoUpdate({
            target: rwaAssets.rwaId,
            set: assetValues(asset, viewedAt),
          });
        await transaction
          .insert(assetActivity)
          .values({ rwaId: asset.rwaId, viewCount: 1, lastViewedAt: viewedAt })
          .onConflictDoUpdate({
            target: assetActivity.rwaId,
            set: {
              viewCount: sql`${assetActivity.viewCount} + 1`,
              lastViewedAt: viewedAt,
            },
          });
      });
    },
  };
}

function assetValues(asset: DetailedAsset, syncedAt: Date) {
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

function toDate(value: string | null) {
  return value === null ? null : new Date(value);
}
