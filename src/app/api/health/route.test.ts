import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  getServerEnv: vi.fn(),
  reportHandledServerError: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  getDatabase: () => ({ execute: mocks.execute }),
}));

vi.mock("@/server/env", () => ({
  getServerEnv: mocks.getServerEnv,
  ServerEnvironmentError: class ServerEnvironmentError extends Error {},
}));

vi.mock("@/server/observability/report", () => ({
  reportHandledServerError: mocks.reportHandledServerError,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerEnv.mockReturnValue({});
  mocks.execute.mockResolvedValue([]);
});

describe("GET /api/health", () => {
  it("reports ready only after the database probe succeeds", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      status: "ready",
      service: "rwa-xray",
      database: "reachable",
    });
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it("returns 503 and reports a failed database probe", async () => {
    const error = new Error("connection failed");
    mocks.execute.mockRejectedValue(error);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.data).toEqual({
      status: "database_unavailable",
      service: "rwa-xray",
      database: "unavailable",
    });
    expect(mocks.reportHandledServerError).toHaveBeenCalledWith(error, {
      event: "health.database_unavailable",
      requestId: expect.any(String),
      route: "/api/health",
      status: 503,
    });
  });
});
