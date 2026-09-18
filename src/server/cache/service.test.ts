import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import { createPersistentCache, MAX_CACHE_AGE_MS } from "./service";
import type { PersistentCacheEntry, PersistentCacheStore } from "./store";

const valueSchema = z.object({ value: z.string() });
const endpoint = "/v5/real-world-assets/assets/list" as const;

class MemoryStore implements PersistentCacheStore {
  readonly entries = new Map<string, PersistentCacheEntry>();

  async get(key: string) {
    return this.entries.get(key) ?? null;
  }

  async put(entry: PersistentCacheEntry) {
    this.entries.set(entry.key, structuredClone(entry));
  }

  async delete(key: string) {
    this.entries.delete(key);
  }

  async deleteExpired(now: Date) {
    let deleted = 0;
    for (const [key, entry] of this.entries) {
      if (entry.staleUntil < now) {
        this.entries.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }
}

describe("persistent cache policy", () => {
  it("stores a miss and serves a subsequent fresh cache hit", async () => {
    const store = new MemoryStore();
    const clock = new Date("2026-09-09T07:00:00.000Z");
    const load = vi.fn(async () => ({ value: "upstream" }));
    const cache = createPersistentCache({ store, now: () => new Date(clock) });

    const first = await cache.getOrLoad({
      key: "asset-list",
      endpoint,
      schema: valueSchema,
      load,
    });
    const second = await cache.getOrLoad({
      key: "asset-list",
      endpoint,
      schema: valueSchema,
      load,
    });

    expect(first.cache.state).toBe("refreshed");
    expect(second.cache.state).toBe("fresh");
    expect(second.value).toEqual({ value: "upstream" });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves valid stale data when an upstream refresh fails", async () => {
    const store = new MemoryStore();
    let clock = new Date("2026-09-09T07:00:00.000Z");
    const cache = createPersistentCache({ store, now: () => new Date(clock) });

    await cache.getOrLoad({
      key: "asset-list",
      endpoint,
      schema: valueSchema,
      load: async () => ({ value: "cached-real-data" }),
    });

    clock = new Date("2026-09-09T07:02:00.000Z");
    const result = await cache.getOrLoad({
      key: "asset-list",
      endpoint,
      schema: valueSchema,
      load: async () => {
        throw new Error("secret internal upstream detail");
      },
    });

    expect(result.value).toEqual({ value: "cached-real-data" });
    expect(result.cache.state).toBe("stale");
    expect(result.refreshError).toEqual({
      code: "UPSTREAM_REFRESH_FAILED",
      message: "Upstream refresh failed; serving the last cached dataset",
    });
    expect(JSON.stringify(result)).not.toContain(
      "secret internal upstream detail",
    );
  });

  it("never serves a cache entry older than the maximum age", async () => {
    const store = new MemoryStore();
    let clock = new Date("2026-09-09T07:00:00.000Z");
    const cache = createPersistentCache({ store, now: () => new Date(clock) });

    await cache.getOrLoad({
      key: "asset-list",
      endpoint,
      schema: valueSchema,
      load: async () => ({ value: "expired" }),
    });

    clock = new Date(clock.getTime() + MAX_CACHE_AGE_MS + 1);
    await expect(
      cache.getOrLoad({
        key: "asset-list",
        endpoint,
        schema: valueSchema,
        load: async () => {
          throw new Error("upstream unavailable");
        },
      }),
    ).rejects.toThrow("upstream unavailable");
  });

  it("discards invalid cached payloads and refreshes from upstream", async () => {
    const store = new MemoryStore();
    const clock = new Date("2026-09-09T07:00:00.000Z");
    store.entries.set("asset-list", {
      key: "asset-list",
      endpoint,
      payload: { unexpected: true },
      observedAt: clock,
      expiresAt: new Date(clock.getTime() + 60_000),
      staleUntil: new Date(clock.getTime() + MAX_CACHE_AGE_MS),
    });
    const cache = createPersistentCache({ store, now: () => new Date(clock) });

    const result = await cache.getOrLoad({
      key: "asset-list",
      endpoint,
      schema: valueSchema,
      load: async () => ({ value: "replacement" }),
    });

    expect(result.value).toEqual({ value: "replacement" });
    expect(result.cache.warning).toBe("CACHE_ENTRY_INVALID");
  });

  it("deduplicates concurrent cache misses", async () => {
    const store = new MemoryStore();
    const clock = new Date("2026-09-09T07:00:00.000Z");
    let resolveLoad: ((value: { value: string }) => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<{ value: string }>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const cache = createPersistentCache({ store, now: () => new Date(clock) });
    const options = { key: "asset-list", endpoint, schema: valueSchema, load };

    const first = cache.getOrLoad(options);
    const second = cache.getOrLoad(options);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    resolveLoad?.({ value: "shared" });

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ value: { value: "shared" } }),
      expect.objectContaining({ value: { value: "shared" } }),
    ]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("continues with upstream data when a cache write fails", async () => {
    const store = new MemoryStore();
    store.put = async () => {
      throw new Error("database unavailable");
    };
    const cache = createPersistentCache({ store });

    const result = await cache.getOrLoad({
      key: "asset-list",
      endpoint,
      schema: valueSchema,
      load: async () => ({ value: "live" }),
    });

    expect(result.value).toEqual({ value: "live" });
    expect(result.cache.warning).toBe("CACHE_WRITE_FAILED");
  });
});
