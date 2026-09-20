import "server-only";

import { redactSensitive } from "@/server/cmc/redact";

export type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type LogRecord = {
  timestamp: string;
  level: LogLevel;
  event: string;
  service: "rwa-xray";
  context?: LogContext;
};

export function logServerEvent(
  level: LogLevel,
  event: string,
  context: LogContext = {},
) {
  if (process.env.NODE_ENV === "test") return;

  const record = createLogRecord(level, event, context);
  const serialized = JSON.stringify(record);

  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

export function createLogRecord(
  level: LogLevel,
  event: string,
  context: LogContext = {},
  now: Date = new Date(),
): LogRecord {
  const safeContext = redactSensitive(context);

  return {
    timestamp: now.toISOString(),
    level,
    event,
    service: "rwa-xray",
    ...(Object.keys(safeContext).length === 0 ? {} : { context: safeContext }),
  };
}

export function errorIdentity(error: unknown) {
  if (!error || typeof error !== "object") {
    return { errorType: typeof error };
  }

  const value = error as { name?: unknown; code?: unknown; digest?: unknown };
  return {
    errorType: typeof value.name === "string" ? value.name : "UnknownError",
    ...(typeof value.code === "string" ? { errorCode: value.code } : {}),
    ...(typeof value.digest === "string" ? { errorDigest: value.digest } : {}),
  };
}
