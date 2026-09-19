import type { Metadata } from "next";

import { IssuerDirectory } from "@/components/issuer-directory";

export const metadata: Metadata = {
  title: "RWA Issuers",
  description:
    "Explore token issuers and trace their issued tokens to canonical real-world assets.",
};

export default function IssuersPage() {
  return (
    <main className="min-h-screen bg-[#02090b] text-[#e7f3f1]">
      <IssuerDirectory />
    </main>
  );
}
