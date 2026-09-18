export {};

const rawOrigin =
  process.argv.slice(2).find((argument) => argument !== "--") ??
  process.env.DEPLOYMENT_URL;

if (!rawOrigin) {
  fail(
    "Provide a deployment URL: pnpm smoke:production -- https://example.com",
  );
}

const origin = normalizeOrigin(rawOrigin);
const isLocal = ["localhost", "127.0.0.1"].includes(origin.hostname);
if (!isLocal && origin.protocol !== "https:") {
  fail("Production smoke tests require an HTTPS deployment URL");
}

const forbiddenResponseKeys = new Set([
  "apikey",
  "api_key",
  "authorization",
  "cachekey",
  "cache_key",
  "databaseurl",
  "database_url",
  "requestheaders",
  "request_headers",
]);

const home = await request("/");
assertSecurityHeaders(home);
await request("/assets");
await request("/compare");
await request("/methodology");

const health = await requestJson("/api/health");
const healthData = readRecord(health.body.data);
if (health.response.status !== 200 || healthData?.status !== "ready") {
  fail("Readiness endpoint did not report ready");
}

const explorer = await requestJson(
  "/api/assets?sort=tokenized_volume_24h&sortDir=desc&limit=2",
);
const explorerData = readRecord(explorer.body.data);
const items = explorerData?.items;
if (!Array.isArray(items) || items.length === 0) {
  fail("Explorer API did not return a real canonical asset");
}

const firstId = readRwaId(items[0]);
await requestJson(`/api/assets/${firstId}`);
await requestJson(`/api/assets/${firstId}/evidence`);

if (items.length >= 2) {
  const secondId = readRwaId(items[1]);
  const comparison = await requestJson("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rwaIds: [firstId, secondId] }),
  });
  const comparisonData = readRecord(comparison.body.data);
  const compared = comparisonData?.items;
  if (!Array.isArray(compared) || compared.length === 0) {
    fail("Compare API returned no available result");
  }
}

console.log(
  JSON.stringify({
    status: "passed",
    pages: 4,
    readiness: true,
    explorerAssets: items.length,
    detail: true,
    evidence: true,
    compare: items.length >= 2,
  }),
);

async function request(path: string, init?: RequestInit) {
  const response = await fetch(new URL(path, origin), {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) fail(`${path} returned HTTP ${response.status}`);
  return response;
}

async function requestJson(path: string, init?: RequestInit) {
  const response = await request(path, init);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    fail(`${path} did not return JSON`);
  }

  const body: unknown = await response.json();
  assertSafePayload(body, path);
  if (!isRecord(body)) fail(`${path} returned an invalid envelope`);
  return { response, body };
}

function assertSecurityHeaders(response: Response) {
  const required = [
    "content-security-policy",
    "referrer-policy",
    "x-content-type-options",
    "x-frame-options",
    "permissions-policy",
    "cross-origin-opener-policy",
  ];
  if (!isLocal) required.push("strict-transport-security");

  for (const header of required) {
    if (!response.headers.has(header))
      fail(`Missing security header: ${header}`);
  }
  if (response.headers.has("x-powered-by")) {
    fail("Framework disclosure header must be disabled");
  }
  const csp = response.headers.get("content-security-policy") ?? "";
  if (!isLocal && csp.includes("'unsafe-eval'")) {
    fail("Production CSP must not allow unsafe-eval");
  }
}

function assertSafePayload(value: unknown, path: string) {
  if (Array.isArray(value)) {
    for (const item of value) assertSafePayload(item, path);
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenResponseKeys.has(key.toLowerCase())) {
      fail(`${path} exposed a forbidden response field`);
    }
    assertSafePayload(child, path);
  }
}

function readRwaId(value: unknown) {
  if (!isRecord(value) || !Number.isInteger(value.rwaId)) {
    fail("Explorer API returned an invalid canonical ID");
  }
  return value.rwaId as number;
}

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) {
      fail("Deployment URL must not contain credentials, query, or fragment");
    }
    url.pathname = "/";
    return url;
  } catch {
    fail("Deployment URL is invalid");
  }
}

function readRecord(value: unknown) {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fail(message: string): never {
  console.error(`Production smoke failed: ${message}`);
  process.exit(1);
}
