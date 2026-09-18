import { getServerEnv } from "@/server/env";
import { successResponse } from "@/server/http/responses";

export function GET() {
  const requestId = crypto.randomUUID();

  try {
    getServerEnv();
    return successResponse(
      {
        status: "ready",
        service: "rwa-xray",
      },
      { requestId },
    );
  } catch {
    return successResponse(
      {
        status: "configuration_error",
        service: "rwa-xray",
      },
      { requestId, status: 503 },
    );
  }
}
