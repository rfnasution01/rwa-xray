import "server-only";

import * as Sentry from "@sentry/nextjs";

import { errorIdentity, logServerEvent } from "./logger";

export function reportHandledServerError(
  error: unknown,
  context: {
    event: string;
    requestId: string;
    route?: string;
    status: number;
  },
) {
  logServerEvent(context.status >= 500 ? "error" : "warn", context.event, {
    requestId: context.requestId,
    route: context.route,
    status: context.status,
    ...errorIdentity(error),
  });

  if (!process.env.SENTRY_DSN || process.env.NODE_ENV !== "production") return;

  Sentry.withScope((scope) => {
    scope.setLevel(context.status >= 500 ? "error" : "warning");
    scope.setTag("error.event", context.event);
    scope.setTag("http.status_code", String(context.status));
    scope.setContext("request", {
      request_id: context.requestId,
      route: context.route,
    });
    Sentry.captureException(error);
  });
}
