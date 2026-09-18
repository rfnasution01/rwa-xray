import "server-only";

import type {
  AssetMetadata,
  DetailedAsset,
  DiscoveryAsset,
  IssuerDetail,
  IssuerSummary,
  ListedAsset,
  MarketPairs,
  NormalizedDataset,
  Page,
} from "@/domain/assets/models";
import {
  normalizedAssetsListDatasetSchema,
  normalizedInfoDatasetSchema,
  normalizedIssuerDatasetSchema,
  normalizedIssuersListDatasetSchema,
  normalizedMapDatasetSchema,
  normalizedMarketPairsDatasetSchema,
  normalizedQuotesLatestDatasetSchema,
} from "@/domain/assets/schemas";
import {
  createPersistentCache,
  type CacheResult,
  type PersistentCache,
} from "@/server/cache/service";
import { createPostgresCacheStore } from "@/server/cache/store";
import { getCmcClient, type CmcClient } from "@/server/cmc/client";
import {
  normalizeRwaAssetsList,
  normalizeRwaInfo,
  normalizeRwaIssuer,
  normalizeRwaIssuersList,
  normalizeRwaMap,
  normalizeRwaMarketPairs,
  normalizeRwaQuotesLatest,
} from "@/server/cmc/normalize";
import {
  assetsListQuerySchema,
  infoQuerySchema,
  issuerQuerySchema,
  issuersListQuerySchema,
  mapQuerySchema,
  marketPairsQuerySchema,
  quotesLatestQuerySchema,
  serializeQuery,
  type AssetsListQuery,
  type InfoQuery,
  type IssuerQuery,
  type IssuersListQuery,
  type MapQuery,
  type MarketPairsQuery,
  type QuotesLatestQuery,
} from "@/server/cmc/queries";

export type RwaRepository = {
  getMap(
    query?: MapQuery,
  ): Promise<CacheResult<NormalizedDataset<Page<DiscoveryAsset>>>>;
  getInfo(
    query: InfoQuery,
  ): Promise<CacheResult<NormalizedDataset<AssetMetadata[]>>>;
  getAssets(
    query?: AssetsListQuery,
  ): Promise<CacheResult<NormalizedDataset<Page<ListedAsset>>>>;
  getMarketPairs(
    query: MarketPairsQuery,
  ): Promise<CacheResult<NormalizedDataset<MarketPairs>>>;
  getQuotesLatest(
    query: QuotesLatestQuery,
  ): Promise<CacheResult<NormalizedDataset<DetailedAsset[]>>>;
  getIssuers(
    query?: IssuersListQuery,
  ): Promise<CacheResult<NormalizedDataset<Page<IssuerSummary>>>>;
  getIssuer(
    query: IssuerQuery,
  ): Promise<CacheResult<NormalizedDataset<IssuerDetail>>>;
};

export function createRwaRepository(options: {
  client: CmcClient;
  cache: PersistentCache;
}): RwaRepository {
  return {
    getMap(query = {}) {
      const parsed = mapQuerySchema.parse(query);
      const endpoint = "/v5/real-world-assets/map" as const;
      return options.cache.getOrLoad({
        key: cacheKey(endpoint, parsed),
        endpoint,
        schema: normalizedMapDatasetSchema,
        load: async (observedAt) =>
          normalizeRwaMap(await options.client.getRwaMap(parsed), {
            observedAt,
          }),
      });
    },

    getInfo(query) {
      const parsed = infoQuerySchema.parse(query);
      const endpoint = "/v5/real-world-assets/info" as const;
      return options.cache.getOrLoad({
        key: cacheKey(endpoint, parsed),
        endpoint,
        schema: normalizedInfoDatasetSchema,
        load: async (observedAt) =>
          normalizeRwaInfo(await options.client.getRwaInfo(parsed), {
            observedAt,
          }),
      });
    },

    getAssets(query = {}) {
      const parsed = assetsListQuerySchema.parse(query);
      const endpoint = "/v5/real-world-assets/assets/list" as const;
      return options.cache.getOrLoad({
        key: cacheKey(endpoint, parsed),
        endpoint,
        schema: normalizedAssetsListDatasetSchema,
        load: async (observedAt) =>
          normalizeRwaAssetsList(await options.client.getRwaAssets(parsed), {
            observedAt,
          }),
      });
    },

    getMarketPairs(query) {
      const parsed = marketPairsQuerySchema.parse(query);
      const endpoint = "/v5/real-world-assets/market-pairs/list" as const;
      return options.cache.getOrLoad({
        key: cacheKey(endpoint, parsed),
        endpoint,
        schema: normalizedMarketPairsDatasetSchema,
        load: async (observedAt) =>
          normalizeRwaMarketPairs(
            await options.client.getRwaMarketPairs(parsed),
            { observedAt },
          ),
      });
    },

    getQuotesLatest(query) {
      const parsed = quotesLatestQuerySchema.parse(query);
      const endpoint = "/v5/real-world-assets/quotes/latest" as const;
      return options.cache.getOrLoad({
        key: cacheKey(endpoint, parsed),
        endpoint,
        schema: normalizedQuotesLatestDatasetSchema,
        load: async (observedAt) =>
          normalizeRwaQuotesLatest(
            await options.client.getRwaQuotesLatest(parsed),
            { observedAt },
          ),
      });
    },

    getIssuers(query = {}) {
      const parsed = issuersListQuerySchema.parse(query);
      const endpoint = "/v5/real-world-assets/issuers/list" as const;
      return options.cache.getOrLoad({
        key: cacheKey(endpoint, parsed),
        endpoint,
        schema: normalizedIssuersListDatasetSchema,
        load: async (observedAt) =>
          normalizeRwaIssuersList(await options.client.getRwaIssuers(parsed), {
            observedAt,
          }),
      });
    },

    getIssuer(query) {
      const parsed = issuerQuerySchema.parse(query);
      const endpoint = "/v5/real-world-assets/issuers" as const;
      return options.cache.getOrLoad({
        key: cacheKey(endpoint, parsed),
        endpoint,
        schema: normalizedIssuerDatasetSchema,
        load: async (observedAt) =>
          normalizeRwaIssuer(await options.client.getRwaIssuer(parsed), {
            observedAt,
          }),
      });
    },
  };
}

function cacheKey(endpoint: string, query: Record<string, unknown>) {
  const serialized = serializeQuery(query).toString();
  return `cmc:${endpoint}${serialized ? `?${serialized}` : ""}`;
}

let singleton: RwaRepository | undefined;

export function getRwaRepository(): RwaRepository {
  singleton ??= createRwaRepository({
    client: getCmcClient(),
    cache: createPersistentCache({ store: createPostgresCacheStore() }),
  });
  return singleton;
}
