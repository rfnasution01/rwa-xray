import "server-only";

import type { RateLimiter } from "./rate-limit";
import { apiRateLimiter, clientRateLimitKey } from "./rate-limit";
import { errorResponse, rateLimitResponse, successResponse } from "./responses";
import {
  compareRequestSchema,
  compareUniverseRequestSchema,
  detailRequestSchema,
  explorerRequestSchema,
  InvalidRequestBodyError,
  issuerDetailRequestSchema,
  issuerDirectoryRequestSchema,
  searchParamsToObject,
} from "./schemas";
import {
  getRwaApplicationService,
  type RwaApplicationService,
} from "@/server/services/rwa-service";

export type ApiHandlers = {
  getAssets(request: Request): Promise<Response>;
  getIssuers(request: Request): Promise<Response>;
  getIssuerDetail(request: Request, issuerId: string): Promise<Response>;
  getAssetDetail(request: Request, rwaId: string): Promise<Response>;
  getCompareUniverse(request: Request): Promise<Response>;
  compareAssets(request: Request): Promise<Response>;
  getAssetEvidence(request: Request, rwaId: string): Promise<Response>;
};

export function createApiHandlers(options: {
  service: RwaApplicationService;
  rateLimiter?: RateLimiter;
  requestId?: () => string;
}): ApiHandlers {
  const rateLimiter = options.rateLimiter ?? apiRateLimiter;
  const requestId = options.requestId ?? (() => crypto.randomUUID());

  return {
    async getAssets(request) {
      const id = requestId();
      const limited = applyRateLimit(request, id, rateLimiter);
      if (limited) return limited;

      try {
        const url = new URL(request.url);
        const input = explorerRequestSchema.parse(
          searchParamsToObject(url.searchParams),
        );
        const result = await options.service.getExplorer(input);
        return successResponse(result, { requestId: id, stale: result.stale });
      } catch (error) {
        return errorResponse(error, id);
      }
    },

    async getIssuers(request) {
      const id = requestId();
      const limited = applyRateLimit(request, id, rateLimiter);
      if (limited) return limited;

      try {
        const url = new URL(request.url);
        const input = issuerDirectoryRequestSchema.parse(
          searchParamsToObject(url.searchParams),
        );
        const result = await options.service.getIssuerDirectory(input);
        return successResponse(result, { requestId: id, stale: result.stale });
      } catch (error) {
        return errorResponse(error, id);
      }
    },

    async getIssuerDetail(request, issuerId) {
      const id = requestId();
      const limited = applyRateLimit(request, id, rateLimiter);
      if (limited) return limited;

      try {
        const url = new URL(request.url);
        const input = issuerDetailRequestSchema.parse({
          ...searchParamsToObject(url.searchParams),
          issuerId,
        });
        const result = await options.service.getIssuerDetail(input);
        return successResponse(result, { requestId: id, stale: result.stale });
      } catch (error) {
        return errorResponse(error, id);
      }
    },

    async getAssetDetail(request, rwaId) {
      const id = requestId();
      const limited = applyRateLimit(request, id, rateLimiter);
      if (limited) return limited;

      try {
        const input = parseDetailRequest(request, rwaId);
        const result = await options.service.getAssetDetail(input);
        return successResponse(result, { requestId: id, stale: result.stale });
      } catch (error) {
        return errorResponse(error, id);
      }
    },

    async getCompareUniverse(request) {
      const id = requestId();
      const limited = applyRateLimit(request, id, rateLimiter);
      if (limited) return limited;

      try {
        const url = new URL(request.url);
        const input = compareUniverseRequestSchema.parse(
          searchParamsToObject(url.searchParams),
        );
        const result = await options.service.getCompareUniverse(input.q);
        return successResponse(result, { requestId: id, stale: result.stale });
      } catch (error) {
        return errorResponse(error, id);
      }
    },

    async compareAssets(request) {
      const id = requestId();
      const limited = applyRateLimit(request, id, rateLimiter);
      if (limited) return limited;

      try {
        const input = compareRequestSchema.parse(await parseJsonBody(request));
        const result = await options.service.compareAssets(input);
        return successResponse(result, { requestId: id, stale: result.stale });
      } catch (error) {
        return errorResponse(error, id);
      }
    },

    async getAssetEvidence(request, rwaId) {
      const id = requestId();
      const limited = applyRateLimit(request, id, rateLimiter);
      if (limited) return limited;

      try {
        const input = parseDetailRequest(request, rwaId);
        const result = await options.service.getAssetEvidence(input);
        return successResponse(result, { requestId: id, stale: result.stale });
      } catch (error) {
        return errorResponse(error, id);
      }
    },
  };
}

function parseDetailRequest(request: Request, rwaId: string) {
  const url = new URL(request.url);
  return detailRequestSchema.parse({
    ...searchParamsToObject(url.searchParams),
    rwaId,
  });
}

async function parseJsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new InvalidRequestBodyError();
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    throw new InvalidRequestBodyError();
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 4096) {
    throw new InvalidRequestBodyError();
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InvalidRequestBodyError();
  }
}

function applyRateLimit(
  request: Request,
  requestId: string,
  rateLimiter: RateLimiter,
) {
  const decision = rateLimiter.check(clientRateLimitKey(request));
  return decision.allowed
    ? null
    : rateLimitResponse(requestId, decision.retryAfterSeconds);
}

let singleton: ApiHandlers | undefined;

export function getApiHandlers() {
  singleton ??= createApiHandlers({ service: getRwaApplicationService() });
  return singleton;
}
