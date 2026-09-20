import { sql } from "drizzle-orm";

import { getDatabase } from "@/server/db";
import { getServerEnv, ServerEnvironmentError } from "@/server/env";
import { successResponse } from "@/server/http/responses";
import { reportHandledServerError } from "@/server/observability/report";

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    getServerEnv();
    await getDatabase().execute(sql`select 1`);
    return successResponse(
      {
        status: "ready",
        service: "rwa-xray",
        database: "reachable",
      },
      { requestId },
    );
  } catch (error) {
    const configurationError = error instanceof ServerEnvironmentError;
    reportHandledServerError(error, {
      event: configurationError
        ? "health.configuration_error"
        : "health.database_unavailable",
      requestId,
      route: "/api/health",
      status: 503,
    });
    return successResponse(
      {
        status: configurationError
          ? "configuration_error"
          : "database_unavailable",
        service: "rwa-xray",
        database: "unavailable",
      },
      { requestId, status: 503 },
    );
  }
}
