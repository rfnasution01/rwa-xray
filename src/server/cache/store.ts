import "server-only";

import { eq, lt } from "drizzle-orm";

import { getDatabase } from "@/server/db";
import { cmcCacheEntries } from "@/server/db/schema";

export type PersistentCacheEntry = {
  key: string;
  endpoint: string;
  payload: unknown;
  observedAt: Date;
  expiresAt: Date;
  staleUntil: Date;
};

export type PersistentCacheStore = {
  get(key: string): Promise<PersistentCacheEntry | null>;
  put(entry: PersistentCacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  deleteExpired(now: Date): Promise<number>;
};

type Database = ReturnType<typeof getDatabase>;

export function createPostgresCacheStore(
  database: Database = getDatabase(),
): PersistentCacheStore {
  return {
    async get(key) {
      const [row] = await database
        .select()
        .from(cmcCacheEntries)
        .where(eq(cmcCacheEntries.cacheKey, key))
        .limit(1);

      if (!row) return null;
      return {
        key: row.cacheKey,
        endpoint: row.endpoint,
        payload: row.payload,
        observedAt: row.observedAt,
        expiresAt: row.expiresAt,
        staleUntil: row.staleUntil,
      };
    },

    async put(entry) {
      await database
        .insert(cmcCacheEntries)
        .values({
          cacheKey: entry.key,
          endpoint: entry.endpoint,
          payload: entry.payload,
          observedAt: entry.observedAt,
          expiresAt: entry.expiresAt,
          staleUntil: entry.staleUntil,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: cmcCacheEntries.cacheKey,
          set: {
            endpoint: entry.endpoint,
            payload: entry.payload,
            observedAt: entry.observedAt,
            expiresAt: entry.expiresAt,
            staleUntil: entry.staleUntil,
            updatedAt: new Date(),
          },
        });
    },

    async delete(key) {
      await database
        .delete(cmcCacheEntries)
        .where(eq(cmcCacheEntries.cacheKey, key));
    },

    async deleteExpired(now) {
      const deleted = await database
        .delete(cmcCacheEntries)
        .where(lt(cmcCacheEntries.staleUntil, now))
        .returning({ key: cmcCacheEntries.cacheKey });
      return deleted.length;
    },
  };
}
