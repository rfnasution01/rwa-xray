import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IssuerDetailView } from "@/components/issuer-detail-view";
import { createPageMetadata } from "@/lib/seo";

type IssuerPageProps = {
  params: Promise<{ issuerId: string }>;
};

export async function generateMetadata({
  params,
}: IssuerPageProps): Promise<Metadata> {
  const { issuerId } = await params;
  if (!/^[0-9a-f]{24}$/.test(issuerId)) {
    return createPageMetadata({
      title: "RWA Issuer",
      description:
        "Inspect issuer metadata and trace reported token relationships to canonical real-world assets.",
      path: "/issuers",
      index: false,
    });
  }

  return createPageMetadata({
    title: `RWA Issuer ${issuerId.slice(0, 8)}`,
    description:
      "Inspect CoinMarketCap issuer metadata and trace reported token relationships without implying reserve, redemption, or legal-claim verification.",
    path: `/issuers/${issuerId}`,
  });
}

export default async function IssuerPage({ params }: IssuerPageProps) {
  const { issuerId } = await params;
  if (!/^[0-9a-f]{24}$/.test(issuerId)) notFound();

  return (
    <main className="min-h-screen bg-[#02090b] text-[#e7f3f1]">
      <IssuerDetailView issuerId={issuerId} />
    </main>
  );
}
