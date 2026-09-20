import type { Instrumentation } from "next";

import { errorIdentity, logServerEvent } from "@/server/observability/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./instrumentation-edge");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  logServerEvent("error", "request.unhandled_error", {
    requestMethod: request.method,
    route: context.routePath,
    routeType: context.routeType,
    runtime: process.env.NEXT_RUNTIME,
    ...errorIdentity(error),
  });

  if (!process.env.SENTRY_DSN || process.env.NODE_ENV !== "production") return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
