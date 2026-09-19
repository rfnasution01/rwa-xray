import { getApiHandlers } from "@/server/http/handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ issuerId: string }> },
) {
  const { issuerId } = await context.params;
  return getApiHandlers().getIssuerDetail(request, issuerId);
}
