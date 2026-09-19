const cmcImageHosts = new Set(["s2.coinmarketcap.com", "s3.coinmarketcap.com"]);

export function safeCmcImageUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      cmcImageHosts.has(url.hostname) &&
      url.pathname.startsWith("/static/img/") &&
      url.search === ""
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
