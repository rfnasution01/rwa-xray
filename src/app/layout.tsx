import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { createPageMetadata, siteConfig } from "@/lib/seo";

import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rootPageMetadata = createPageMetadata({
  title: siteConfig.title,
  description: siteConfig.description,
  path: "/",
  absoluteTitle: true,
});

export const metadata: Metadata = {
  ...rootPageMetadata,
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: "%s | RWA X-Ray",
  },
  applicationName: siteConfig.name,
  authors: [{ name: "RWA X-Ray", url: siteConfig.url }],
  creator: "RWA X-Ray",
  publisher: "RWA X-Ray",
  category: "finance",
  keywords: [
    "real-world assets",
    "RWA",
    "tokenized assets",
    "market capacity",
    "market concentration",
    "CoinMarketCap API",
    "tokenized treasuries",
  ],
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#02090b",
};

const applicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires a modern web browser with JavaScript enabled",
  isAccessibleForFree: true,
  featureList: [
    "RWA market-capacity scenarios",
    "Market concentration analysis",
    "Evidence coverage and source lineage",
    "Two-to-four asset comparison",
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(applicationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
