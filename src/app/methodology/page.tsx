import type { Metadata } from "next";

import { MethodologyView } from "@/components/methodology-view";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How RWA X-Ray calculates transparent market-capacity scenarios, concentration, health, and evidence coverage.",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#02090b] text-[#e7f3f1]">
      <MethodologyView />
    </main>
  );
}
