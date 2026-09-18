import type { Metadata } from "next";

import { CompareView } from "@/components/compare-view";

export const metadata: Metadata = {
  title: "Compare RWA Capacity",
  description:
    "Compare two to four tokenized assets under one transparent volume-participation scenario.",
};

export default function ComparePage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <CompareView />
    </main>
  );
}
