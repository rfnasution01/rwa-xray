import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/server/env";

import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDatabase() {
  if (!database) {
    const client = postgres(getServerEnv().DATABASE_URL, { prepare: false });
    database = drizzle(client, { schema });
  }

  return database;
}
