import type { Metadata } from "next";

const fallbackSiteUrl = "https://rwa-xray.vercel.app";

export const siteConfig = {
  name: "RWA X-Ray",
  title: "RWA X-Ray — Tokenized Asset Market Capacity",
  description:
    "Analyze tokenized real-world assets with transparent market-capacity scenarios, concentration metrics, and traceable CoinMarketCap evidence.",
  url: resolveSiteUrl(process.env.NEXT_PUBLIC_APP_URL),
  locale: "en_US",
} as const;

export function createPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  index?: boolean;
}): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const resolvedTitle = absoluteTitle ? { absolute: title } : title;

  return {
    title: resolvedTitle,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url: canonicalPath,
      siteName: siteConfig.name,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false },
  };
}

function resolveSiteUrl(value: string | undefined): string {
  if (!value) return fallbackSiteUrl;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      return fallbackSiteUrl;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      return fallbackSiteUrl;
    return url.origin;
  } catch {
    return fallbackSiteUrl;
  }
}
