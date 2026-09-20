import type { Metadata } from "next";

import { AssetExplorer } from "@/components/asset-explorer";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "RWA Explorer",
  description:
    "Explore tokenized real-world assets by observed market cap, 24-hour volume, turnover, asset type, and evidence freshness.",
  path: "/assets",
});

export default function AssetsPage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <AssetExplorer />
    </main>
  );
}
