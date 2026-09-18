import { describe, expect, it, vi } from "vitest";

import assetsListFixture from "../../../tests/fixtures/cmc/rwa-assets-list.json";
import infoFixture from "../../../tests/fixtures/cmc/rwa-info.json";
import issuerFixture from "../../../tests/fixtures/cmc/rwa-issuer.json";
import issuersListFixture from "../../../tests/fixtures/cmc/rwa-issuers-list.json";
import mapFixture from "../../../tests/fixtures/cmc/rwa-map.json";
import marketPairsFixture from "../../../tests/fixtures/cmc/rwa-market-pairs.json";
import quotesLatestFixture from "../../../tests/fixtures/cmc/rwa-quotes-latest.json";
import { createPersistentCache } from "@/server/cache/service";
import type {
  PersistentCacheEntry,
  PersistentCacheStore,
} from "@/server/cache/store";
import type { CmcClient } from "@/server/cmc/client";
import {
  rwaAssetsListResponseSchema,
  rwaInfoResponseSchema,
  rwaIssuerResponseSchema,
  rwaIssuersListResponseSchema,
  rwaMapResponseSchema,
  rwaMarketPairsResponseSchema,
  rwaQuotesLatestResponseSchema,
} from "@/server/cmc/schemas";

import { createRwaRepository } from "./rwa-repository";

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
    let count = 0;
    for (const [key, entry] of this.entries) {
      if (entry.staleUntil < now) {
        this.entries.delete(key);
        count += 1;
      }
    }
    return count;
  }
}

function fixtureClient(): CmcClient {
  return {
    getRwaMap: vi.fn(async () => rwaMapResponseSchema.parse(mapFixture)),
    getRwaInfo: vi.fn(async () => rwaInfoResponseSchema.parse(infoFixture)),
    getRwaAssets: vi.fn(async () =>
      rwaAssetsListResponseSchema.parse(assetsListFixture),
    ),
    getRwaMarketPairs: vi.fn(async () =>
      rwaMarketPairsResponseSchema.parse(marketPairsFixture),
    ),
    getRwaQuotesLatest: vi.fn(async () =>
      rwaQuotesLatestResponseSchema.parse(quotesLatestFixture),
    ),
    getRwaIssuers: vi.fn(async () =>
      rwaIssuersListResponseSchema.parse(issuersListFixture),
    ),
    getRwaIssuer: vi.fn(async () =>
      rwaIssuerResponseSchema.parse(issuerFixture),
    ),
  };
}

describe("RWA repository", () => {
  it("normalizes, persists, and reuses canonical asset-list requests", async () => {
    const store = new MemoryStore();
    const client = fixtureClient();
    const clock = new Date("2026-09-09T07:00:00.000Z");
    const repository = createRwaRepository({
      client,
      cache: createPersistentCache({ store, now: () => new Date(clock) }),
    });

    const first = await repository.getAssets({
      assetType: "government_security",
    });
    const second = await repository.getAssets({
      assetType: "government_security",
      convert: "USD",
    });

    expect(first.cache.state).toBe("refreshed");
    expect(second.cache.state).toBe("fresh");
    expect(first.value.data.items[0]).toMatchObject({
      rwaId: 101,
      assetType: "government_security",
      quote: { currency: "USD", tokenizedVolume24h: 500_000 },
    });
    expect(client.getRwaAssets).toHaveBeenCalledTimes(1);
    expect([...store.entries.keys()]).toEqual([
      "cmc:/v5/real-world-assets/assets/list?asset_type=government_security&convert=USD",
    ]);
    expect([...store.entries.keys()][0]).not.toContain("api");
  });

  it("returns repository data with explicit stale metadata during an outage", async () => {
    const store = new MemoryStore();
    const client = fixtureClient();
    let clock = new Date("2026-09-09T07:00:00.000Z");
    const repository = createRwaRepository({
      client,
      cache: createPersistentCache({ store, now: () => new Date(clock) }),
    });

    await repository.getAssets({ assetType: "government_security" });
    clock = new Date("2026-09-09T07:02:00.000Z");
    vi.mocked(client.getRwaAssets).mockRejectedValueOnce(
      new Error("upstream unavailable"),
    );

    const result = await repository.getAssets({
      assetType: "government_security",
    });
    expect(result.cache.state).toBe("stale");
    expect(result.refreshError?.code).toBe("UPSTREAM_REFRESH_FAILED");
    expect(result.value.data.items[0]?.rwaId).toBe(101);
  });
});
