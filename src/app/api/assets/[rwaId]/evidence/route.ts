import { getApiHandlers } from "@/server/http/handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ rwaId: string }> },
) {
  const { rwaId } = await context.params;
  return getApiHandlers().getAssetEvidence(request, rwaId);
}
