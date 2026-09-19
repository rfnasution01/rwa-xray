import type { Metadata } from "next";

import { CompareView } from "@/components/compare-view";

export const metadata: Metadata = {
  title: "Compare RWA Capacity",
  description:
    "Compare two to four tokenized assets under one transparent volume-participation scenario.",
};

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[#02090b] text-[#e7f3f1]">
      <CompareView />
    </main>
  );
}
