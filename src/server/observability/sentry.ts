import type { ErrorEvent } from "@sentry/nextjs";

import { redactSensitive } from "@/server/cmc/redact";

export function sentryOptions() {
  const dsn = process.env.SENTRY_DSN;

  return {
    dsn,
    enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event: ErrorEvent): ErrorEvent | null {
      return sanitizeSentryEvent(event);
    },
  };
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  const sanitized = redactSensitive(event);

  sanitized.user = undefined;

  if (sanitized.request) {
    sanitized.request.headers = undefined;
    sanitized.request.cookies = undefined;
    sanitized.request.data = undefined;
    sanitized.request.query_string = undefined;

    if (sanitized.request.url) {
      sanitized.request.url = stripUrlDetails(sanitized.request.url);
    }
  }

  if (sanitized.breadcrumbs) {
    sanitized.breadcrumbs = sanitized.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      data: sanitizeBreadcrumbData(breadcrumb.data),
    }));
  }

  return redactKnownSecrets(sanitized);
}

function stripUrlDetails(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

function sanitizeBreadcrumbData(data: Record<string, unknown> | undefined) {
  if (!data) return data;

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      key.toLowerCase() === "url" && typeof value === "string"
        ? stripUrlDetails(value)
        : value,
    ]),
  );
}

function redactKnownSecrets<T>(value: T): T {
  const secrets = [
    process.env.CMC_API_KEY,
    process.env.DATABASE_URL,
    process.env.GEMINI_API_KEY,
    process.env.SENTRY_DSN,
  ].filter((secret): secret is string => Boolean(secret));

  if (secrets.length === 0) return value;
  return replaceSecrets(value, secrets, new WeakSet<object>()) as T;
}

function replaceSecrets(
  value: unknown,
  secrets: string[],
  seen: WeakSet<object>,
): unknown {
  if (typeof value === "string") {
    return secrets.reduce(
      (result, secret) => result.replaceAll(secret, "[REDACTED]"),
      value,
    );
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    return value.map((item) => replaceSecrets(item, secrets, seen));
  }

  if (value && typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        replaceSecrets(child, secrets, seen),
      ]),
    );
  }

  return value;
}
