export function formatMoney(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);
}

export function formatCurrency(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: value < 1 ? 4 : 2,
      }).format(value);
}

export function formatPercent(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(value);
}

export function formatNumber(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(
        value,
      );
}

export function formatDays(value: number) {
  return value < 0.1
    ? "<0.1"
    : value >= 1_000
      ? ">999"
      : new Intl.NumberFormat("en-US", {
          maximumFractionDigits: value < 10 ? 1 : 0,
        }).format(value);
}

export function issuerHref(issuerId: string | null) {
  return issuerId && /^[0-9a-f]{24}$/.test(issuerId)
    ? `/issuers/${issuerId}`
    : null;
}

export function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function formatType(value: string) {
  return value.replaceAll("_", " ");
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
