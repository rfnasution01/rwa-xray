import type { Metadata } from "next";

import { CompareView } from "@/components/compare-view";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Compare RWA Market Capacity",
  description:
    "Compare two to four tokenized real-world assets under one transparent position, volume-participation, and stress scenario.",
  path: "/compare",
});

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[#02090b] text-[#e7f3f1]">
      <CompareView />
    </main>
  );
}
