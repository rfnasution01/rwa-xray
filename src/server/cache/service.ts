import "server-only";

import type { z } from "zod";

import { CmcApiError } from "@/server/cmc/error";
import { errorIdentity, logServerEvent } from "@/server/observability/logger";

import type { PersistentCacheEntry, PersistentCacheStore } from "./store";

export const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1_000;

/**
 * Application freshness policy. These TTLs are intentionally independent from
 * each endpoint's advertised upstream update interval.
 */
export const CMC_CACHE_TTL_MS = {
  "/v5/real-world-assets/map": 30_000,
  "/v5/real-world-assets/info": 24 * 60 * 60 * 1_000,
  "/v5/real-world-assets/assets/list": 60_000,
  "/v5/real-world-assets/market-pairs/list": 60_000,
  "/v5/real-world-assets/quotes/latest": 60_000,
  "/v5/real-world-assets/issuers/list": 60 * 60 * 1_000,
  "/v5/real-world-assets/issuers": 60 * 60 * 1_000,
} as const;

export type CacheState = "fresh" | "refreshed" | "stale";
export type CacheWarningCode =
  "CACHE_READ_FAILED" | "CACHE_WRITE_FAILED" | "CACHE_ENTRY_INVALID";

export type CacheResult<T> = {
  value: T;
  cache: {
    key: string;
    state: CacheState;
    observedAt: string;
    expiresAt: string;
    staleUntil: string;
    warning: CacheWarningCode | null;
  };
  refreshError: {
    code: string;
    message: "Upstream refresh failed; serving the last cached dataset";
  } | null;
};

export type CacheLoadOptions<T> = {
  key: string;
  endpoint: keyof typeof CMC_CACHE_TTL_MS;
  schema: z.ZodType<T>;
  load: (observedAt: Date) => Promise<T>;
};

export type PersistentCache = {
  getOrLoad<T>(options: CacheLoadOptions<T>): Promise<CacheResult<T>>;
};

export function createPersistentCache(options: {
  store: PersistentCacheStore;
  now?: () => Date;
}): PersistentCache {
  const now = options.now ?? (() => new Date());
  const inFlight = new Map<string, Promise<CacheResult<unknown>>>();

  return {
    getOrLoad<T>(loadOptions: CacheLoadOptions<T>): Promise<CacheResult<T>> {
      const existing = inFlight.get(loadOptions.key);
      if (existing) return existing as Promise<CacheResult<T>>;

      const operation = execute(loadOptions).finally(() =>
        inFlight.delete(loadOptions.key),
      );
      inFlight.set(loadOptions.key, operation as Promise<CacheResult<unknown>>);
      return operation;
    },
  };

  async function execute<T>(
    loadOptions: CacheLoadOptions<T>,
  ): Promise<CacheResult<T>> {
    const readTime = validNow(now());
    let cacheWarning: CacheWarningCode | null = null;
    let cached: { entry: PersistentCacheEntry; value: T } | null = null;

    try {
      const entry = await options.store.get(loadOptions.key);
      if (entry) {
        const parsed = loadOptions.schema.safeParse(entry.payload);
        const datesValid = [
          entry.observedAt,
          entry.expiresAt,
          entry.staleUntil,
        ].every(
          (date) => date instanceof Date && Number.isFinite(date.getTime()),
        );

        if (parsed.success && datesValid) {
          cached = { entry, value: parsed.data };
        } else {
          cacheWarning = "CACHE_ENTRY_INVALID";
          logServerEvent("warn", "cache.entry_invalid", {
            endpoint: loadOptions.endpoint,
          });
          await safeDelete(options.store, loadOptions.key);
        }
      }
    } catch (error) {
      cacheWarning = "CACHE_READ_FAILED";
      logServerEvent("warn", "cache.read_failed", {
        endpoint: loadOptions.endpoint,
        ...errorIdentity(error),
      });
    }

    if (cached && readTime.getTime() <= cached.entry.expiresAt.getTime()) {
      return resultFromEntry(
        cached.value,
        cached.entry,
        "fresh",
        cacheWarning,
        null,
      );
    }

    try {
      const loaded = await loadOptions.load(readTime);
      const parsed = loadOptions.schema.parse(loaded);
      const writeTime = validNow(now());
      const ttl = CMC_CACHE_TTL_MS[loadOptions.endpoint];
      const entry: PersistentCacheEntry = {
        key: loadOptions.key,
        endpoint: loadOptions.endpoint,
        payload: parsed,
        observedAt: writeTime,
        expiresAt: new Date(writeTime.getTime() + ttl),
        staleUntil: new Date(writeTime.getTime() + MAX_CACHE_AGE_MS),
      };

      try {
        await options.store.put(entry);
      } catch (error) {
        cacheWarning = "CACHE_WRITE_FAILED";
        logServerEvent("warn", "cache.write_failed", {
          endpoint: loadOptions.endpoint,
          ...errorIdentity(error),
        });
      }

      return resultFromEntry(parsed, entry, "refreshed", cacheWarning, null);
    } catch (error) {
      if (cached && readTime.getTime() <= cached.entry.staleUntil.getTime()) {
        logServerEvent("warn", "cache.stale_served", {
          endpoint: loadOptions.endpoint,
          ...errorIdentity(error),
        });
        return resultFromEntry(
          cached.value,
          cached.entry,
          "stale",
          cacheWarning,
          {
            code: publicErrorCode(error),
            message: "Upstream refresh failed; serving the last cached dataset",
          },
        );
      }
      throw error;
    }
  }
}

function resultFromEntry<T>(
  value: T,
  entry: PersistentCacheEntry,
  state: CacheState,
  warning: CacheWarningCode | null,
  refreshError: CacheResult<T>["refreshError"],
): CacheResult<T> {
  return {
    value,
    cache: {
      key: entry.key,
      state,
      observedAt: entry.observedAt.toISOString(),
      expiresAt: entry.expiresAt.toISOString(),
      staleUntil: entry.staleUntil.toISOString(),
      warning,
    },
    refreshError,
  };
}

async function safeDelete(store: PersistentCacheStore, key: string) {
  try {
    await store.delete(key);
  } catch {
    // The invalid entry is ignored in memory even when cleanup fails.
  }
}

function publicErrorCode(error: unknown) {
  return error instanceof CmcApiError ? error.code : "UPSTREAM_REFRESH_FAILED";
}

function validNow(value: Date) {
  if (!Number.isFinite(value.getTime()))
    throw new TypeError("Cache clock returned an invalid Date");
  return value;
}
