import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssetDetailView } from "@/components/asset-detail-view";

export const metadata: Metadata = {
  title: "Asset X-Ray",
  description:
    "Inspect RWA market capacity, concentration, evidence coverage, and volume-participation scenarios.",
};

export default async function AssetPage({
  params,
}: {
  params: Promise<{ rwaId: string }>;
}) {
  const { rwaId } = await params;
  if (!/^\d+$/.test(rwaId)) notFound();
  const parsed = Number(rwaId);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) notFound();

  return (
    <main className="bg-background text-foreground min-h-screen">
      <AssetDetailView rwaId={parsed} />
    </main>
  );
}
