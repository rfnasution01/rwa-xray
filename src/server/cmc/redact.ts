const REDACTED = "[REDACTED]";
const sensitiveKeyPattern =
  /^(authorization|cookie|set[-_]cookie|x[-_]cmc[-_]pro[-_]api[-_]key|cmc_api_key|database_url|gemini_api_key|sentry_dsn)$/i;

export function redactSensitive<T>(value: T): T {
  return redactValue(value, new WeakSet<object>()) as T;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    return value.map((item) => redactValue(item, seen));
  }

  if (value && typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);

    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = sensitiveKeyPattern.test(key)
        ? REDACTED
        : redactValue(child, seen);
    }
    return output;
  }

  return value;
}
