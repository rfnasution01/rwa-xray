import { describe, expect, it, vi } from "vitest";

import type { RateLimiter } from "./rate-limit";
import { createApiHandlers } from "./handlers";
import {
  ApplicationServiceError,
  type AssetDetailResult,
  type ExplorerResult,
  type IssuerDetailResult,
  type IssuerDirectoryResult,
  type RwaApplicationService,
} from "@/server/services/rwa-service";

const sourceStatus: ExplorerResult["sourceStatus"] = {
  source: "assets",
  evidence: {
    provider: "coinmarketcap",
    endpoint: "/v5/real-world-assets/assets/list",
    responseTimestamp: "2026-09-09T07:00:00.000Z",
    observedAt: "2026-09-09T07:00:00.000Z",
    creditCount: 1,
    notice: null,
  },
  normalizationWarnings: [],
  cache: {
    state: "fresh",
    observedAt: "2026-09-09T07:00:00.000Z",
    expiresAt: "2026-09-09T07:01:00.000Z",
    staleUntil: "2026-09-10T07:00:00.000Z",
    warning: null,
  },
  refreshErrorCode: null,
};

function service(): RwaApplicationService {
  return {
    getExplorer: vi.fn(async (): Promise<ExplorerResult> => ({
      items: [],
      pagination: { totalSize: 0, hasMore: false },
      sourceStatus,
      stale: false,
    })),
    getIssuerDirectory: vi.fn(async () => {
      throw new Error("not configured");
    }),
    getIssuerDetail: vi.fn(async () => {
      throw new Error("not configured");
    }),
    getAssetDetail: vi.fn(async (): Promise<AssetDetailResult> => {
      throw new Error("not configured");
    }),
    compareAssets: vi.fn(async () => {
      throw new Error("not configured");
    }),
    getAssetEvidence: vi.fn(async () => {
      throw new Error("not configured");
    }),
  };
}

const allowAll: RateLimiter = {
  check: () => ({ allowed: true, remaining: 59, retryAfterSeconds: 60 }),
};

function handlers(applicationService = service(), rateLimiter = allowAll) {
  return {
    applicationService,
    handlers: createApiHandlers({
      service: applicationService,
      rateLimiter,
      requestId: () => "request-123",
    }),
  };
}

describe("API handlers", () => {
  it("validates explorer parameters and returns the standard success envelope", async () => {
    const { handlers: api, applicationService } = handlers();
    const response = await api.getAssets(
      new Request(
        "https://example.test/api/assets?assetType=government_security&limit=20&sortDir=desc",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Request-Id")).toBe("request-123");
    expect(body).toMatchObject({
      data: { items: [], stale: false },
      meta: { requestId: "request-123", stale: false },
    });
    expect(applicationService.getExplorer).toHaveBeenCalledWith({
      assetType: "government_security",
      sort: "rwa_rank",
      sortDir: "desc",
      start: 1,
      limit: 20,
    });
  });

  it("rejects unknown and duplicate query parameters", async () => {
    const { handlers: api } = handlers();
    const unknown = await api.getAssets(
      new Request("https://example.test/api/assets?unexpected=true"),
    );
    const duplicate = await api.getAssets(
      new Request("https://example.test/api/assets?limit=10&limit=20"),
    );

    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toMatchObject({
      error: { code: "INVALID_REQUEST", retryable: false },
    });
    expect(duplicate.status).toBe(400);
  });

  it("validates issuer directory and detail requests", async () => {
    const applicationService = service();
    vi.mocked(applicationService.getIssuerDirectory).mockResolvedValueOnce({
      items: [],
      pagination: { totalSize: 0, hasMore: false },
      sourceStatus: { ...sourceStatus, source: "issuers" },
      stale: false,
    } satisfies IssuerDirectoryResult);
    vi.mocked(applicationService.getIssuerDetail).mockResolvedValueOnce({
      issuer: {
        issuerId: "6878977dcbbf471de3366e85",
        name: "Example Issuer",
        website: null,
        logo: null,
        tokenCount: 0,
        tokens: [],
        linkedTokenTotal: 0,
        hasMore: false,
      },
      sourceStatus: { ...sourceStatus, source: "issuers" },
      stale: false,
    } satisfies IssuerDetailResult);
    const { handlers: api } = handlers(applicationService);

    const directoryResponse = await api.getIssuers(
      new Request("https://example.test/api/issuers?active=false&limit=24"),
    );
    const detailResponse = await api.getIssuerDetail(
      new Request(
        "https://example.test/api/issuers/6878977dcbbf471de3366e85?limit=100",
      ),
      "6878977dcbbf471de3366e85",
    );

    expect(directoryResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(applicationService.getIssuerDirectory).toHaveBeenCalledWith({
      active: false,
      start: 1,
      limit: 24,
    });
    expect(applicationService.getIssuerDetail).toHaveBeenCalledWith({
      issuerId: "6878977dcbbf471de3366e85",
      start: 1,
      limit: 100,
    });
  });

  it("rejects invalid issuer identifiers", async () => {
    const { handlers: api } = handlers();
    const response = await api.getIssuerDetail(
      new Request("https://example.test/api/issuers/not-valid"),
      "not-valid",
    );
    expect(response.status).toBe(400);
  });

  it("parses the detail scenario with approved defaults", async () => {
    const applicationService = service();
    vi.mocked(applicationService.getAssetDetail).mockRejectedValueOnce(
      new ApplicationServiceError("ASSET_NOT_FOUND", "not found"),
    );
    const { handlers: api } = handlers(applicationService);

    const response = await api.getAssetDetail(
      new Request("https://example.test/api/assets/101"),
      "101",
    );

    expect(response.status).toBe(404);
    expect(applicationService.getAssetDetail).toHaveBeenCalledWith({
      rwaId: 101,
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });
  });

  it("does not expose internal error messages", async () => {
    const applicationService = service();
    vi.mocked(applicationService.getExplorer).mockRejectedValueOnce(
      new Error("DATABASE_URL and secret internal detail"),
    );
    const { handlers: api } = handlers(applicationService);

    const response = await api.getAssets(
      new Request("https://example.test/api/assets"),
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).toContain("INTERNAL_ERROR");
    expect(body).not.toContain("DATABASE_URL");
    expect(body).not.toContain("secret internal detail");
  });

  it("returns a bounded rate-limit response before calling the service", async () => {
    const applicationService = service();
    const denied: RateLimiter = {
      check: () => ({ allowed: false, remaining: 0, retryAfterSeconds: 30 }),
    };
    const { handlers: api } = handlers(applicationService, denied);

    const response = await api.getAssets(
      new Request("https://example.test/api/assets"),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(applicationService.getExplorer).not.toHaveBeenCalled();
  });

  it("validates and forwards a compare request", async () => {
    const applicationService = service();
    vi.mocked(applicationService.compareAssets).mockResolvedValueOnce({
      items: [],
      failures: [],
      scenario: {
        positionValue: 500_000,
        participationRate: 0.01,
        stressHaircut: 0.5,
      },
      stale: false,
    });
    const { handlers: api } = handlers(applicationService);

    const response = await api.compareAssets(
      new Request("https://example.test/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rwaIds: [101, 102],
          positionValue: 500_000,
          participationRate: 0.01,
          stressHaircut: 0.5,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(applicationService.compareAssets).toHaveBeenCalledWith({
      rwaIds: [101, 102],
      positionValue: 500_000,
      participationRate: 0.01,
      stressHaircut: 0.5,
    });
  });

  it("rejects malformed, duplicate, and oversized compare bodies", async () => {
    const { handlers: api } = handlers();
    const malformed = await api.compareAssets(
      new Request("https://example.test/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    const duplicate = await api.compareAssets(
      new Request("https://example.test/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rwaIds: [101, 101] }),
      }),
    );
    const oversized = await api.compareAssets(
      new Request("https://example.test/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rwaIds: [101, 102], padding: "x".repeat(4096) }),
      }),
    );

    expect(malformed.status).toBe(400);
    expect(duplicate.status).toBe(400);
    expect(oversized.status).toBe(400);
  });

  it("parses evidence scenario defaults", async () => {
    const applicationService = service();
    vi.mocked(applicationService.getAssetEvidence).mockRejectedValueOnce(
      new ApplicationServiceError("ASSET_NOT_FOUND", "not found"),
    );
    const { handlers: api } = handlers(applicationService);

    const response = await api.getAssetEvidence(
      new Request("https://example.test/api/assets/101/evidence"),
      "101",
    );

    expect(response.status).toBe(404);
    expect(applicationService.getAssetEvidence).toHaveBeenCalledWith({
      rwaId: 101,
      positionValue: 100_000,
      participationRate: 0.05,
      stressHaircut: 0,
    });
  });

  it("rejects scenario values outside approved boundaries", async () => {
    const { handlers: api } = handlers();
    const response = await api.getAssetDetail(
      new Request("https://example.test/api/assets/101?participationRate=0.5"),
      "101",
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
  });
});
