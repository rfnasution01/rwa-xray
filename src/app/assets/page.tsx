import type { Metadata } from "next";

import { AssetExplorer } from "@/components/asset-explorer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "RWA Explorer",
  description:
    "Explore observed market cap, volume, and turnover across tokenized real-world assets.",
};

export default function AssetsPage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <SiteHeader />
      <AssetExplorer />
    </main>
  );
}
