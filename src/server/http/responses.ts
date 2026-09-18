import { ZodError } from "zod";

import { CmcApiError } from "@/server/cmc/error";
import {
  DuplicateQueryParameterError,
  InvalidRequestBodyError,
} from "@/server/http/schemas";
import { ApplicationServiceError } from "@/server/services/rwa-service";

export function successResponse<T>(
  data: T,
  options: { requestId: string; stale?: boolean; status?: number },
) {
  return Response.json(
    {
      data,
      meta: {
        requestId: options.requestId,
        generatedAt: new Date().toISOString(),
        stale: options.stale ?? false,
      },
    },
    {
      status: options.status ?? 200,
      headers: responseHeaders(options.requestId),
    },
  );
}

export function errorResponse(error: unknown, requestId: string) {
  if (error instanceof ZodError) {
    return jsonError(
      400,
      "INVALID_REQUEST",
      "Request parameters are invalid",
      false,
      requestId,
      {
        fields: error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
        })),
      },
    );
  }
  if (error instanceof InvalidRequestBodyError) {
    return jsonError(
      400,
      "INVALID_REQUEST",
      "Request body must be valid JSON",
      false,
      requestId,
    );
  }
  if (error instanceof DuplicateQueryParameterError) {
    return jsonError(
      400,
      "INVALID_REQUEST",
      "Duplicate query parameters are not allowed",
      false,
      requestId,
    );
  }
  if (error instanceof ApplicationServiceError) {
    if (error.code === "ASSET_NOT_FOUND") {
      return jsonError(
        404,
        error.code,
        "The requested RWA asset was not found",
        false,
        requestId,
      );
    }
    return jsonError(
      503,
      error.code,
      "Required market data is temporarily unavailable",
      true,
      requestId,
    );
  }
  if (error instanceof CmcApiError) {
    const status =
      error.code === "CMC_RATE_LIMITED"
        ? 503
        : error.status && error.status < 500
          ? 502
          : 503;
    return jsonError(
      status,
      "UPSTREAM_UNAVAILABLE",
      "Market data is temporarily unavailable",
      true,
      requestId,
    );
  }
  return jsonError(
    500,
    "INTERNAL_ERROR",
    "An unexpected server error occurred",
    false,
    requestId,
  );
}

export function rateLimitResponse(
  requestId: string,
  retryAfterSeconds: number,
) {
  const response = jsonError(
    429,
    "RATE_LIMITED",
    "Too many requests",
    true,
    requestId,
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

function jsonError(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
  requestId: string,
  details?: unknown,
) {
  return Response.json(
    {
      error: {
        code,
        message,
        retryable,
        ...(details === undefined ? {} : { details }),
      },
      meta: { requestId },
    },
    { status, headers: responseHeaders(requestId) },
  );
}

function responseHeaders(requestId: string) {
  return {
    "Cache-Control": "no-store",
    "X-Request-Id": requestId,
    "X-Content-Type-Options": "nosniff",
  };
}
