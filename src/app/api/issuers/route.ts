import { getApiHandlers } from "@/server/http/handlers";

export async function GET(request: Request) {
  return getApiHandlers().getIssuers(request);
}
