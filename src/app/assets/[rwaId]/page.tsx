import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssetDetailView } from "@/components/asset-detail/asset-detail-view";
import { createPageMetadata } from "@/lib/seo";

type AssetPageProps = {
  params: Promise<{ rwaId: string }>;
};

export async function generateMetadata({
  params,
}: AssetPageProps): Promise<Metadata> {
  const { rwaId } = await params;
  const parsed = Number(rwaId);
  const validId =
    /^\d+$/.test(rwaId) && Number.isSafeInteger(parsed) && parsed > 0;
  if (!validId) {
    return createPageMetadata({
      title: "Asset X-Ray",
      description:
        "Inspect tokenized RWA market capacity, concentration, evidence coverage, and volume-participation scenarios.",
      path: "/assets",
      index: false,
    });
  }

  return createPageMetadata({
    title: `RWA Asset #${parsed} Market Capacity`,
    description:
      "Inspect this tokenized real-world asset's observed volume, concentration, market pairs, evidence coverage, and exit-capacity scenarios.",
    path: `/assets/${parsed}`,
  });
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { rwaId } = await params;
  if (!/^\d+$/.test(rwaId)) notFound();
  const parsed = Number(rwaId);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) notFound();

  return (
    <main className="min-h-screen bg-[#02090b] text-[#e6f1ef]">
      <AssetDetailView rwaId={parsed} />
    </main>
  );
}
