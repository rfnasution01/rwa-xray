import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IssuerDetailView } from "@/components/issuer-detail-view";

export const metadata: Metadata = {
  title: "Issuer Detail",
  description:
    "Inspect an RWA issuer and trace its token relationships to underlying assets.",
};

export default async function IssuerPage({
  params,
}: {
  params: Promise<{ issuerId: string }>;
}) {
  const { issuerId } = await params;
  if (!/^[0-9a-f]{24}$/.test(issuerId)) notFound();

  return (
    <main className="min-h-screen bg-[#02090b] text-[#e7f3f1]">
      <IssuerDetailView issuerId={issuerId} />
    </main>
  );
}
