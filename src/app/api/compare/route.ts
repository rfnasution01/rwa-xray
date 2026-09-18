import { getApiHandlers } from "@/server/http/handlers";

export async function POST(request: Request) {
  return getApiHandlers().compareAssets(request);
}
