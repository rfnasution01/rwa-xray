import type { Metadata } from "next";

import { IssuerDirectory } from "@/components/issuer-directory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "RWA Issuer Directory",
  description:
    "Explore token issuers reported by CoinMarketCap and trace issued tokens to canonical real-world assets without implying reserve verification.",
  path: "/issuers",
});

export default function IssuersPage() {
  return (
    <main className="min-h-screen bg-[#02090b] text-[#e7f3f1]">
      <IssuerDirectory />
    </main>
  );
}
