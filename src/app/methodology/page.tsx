import type { Metadata } from "next";

import { MethodologyView } from "@/components/methodology-view";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Market-Capacity Methodology",
  description:
    "Review the formulas, assumptions, confidence rules, and limitations behind RWA X-Ray market-capacity and concentration analysis.",
  path: "/methodology",
});

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#02090b] text-[#e7f3f1]">
      <MethodologyView />
    </main>
  );
}
