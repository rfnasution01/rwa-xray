import "server-only";

import type { z } from "zod";

import { getServerEnv } from "@/server/env";

import { CmcApiError, errorCodeForStatus, isRetryableStatus } from "./error";
import {
  assetsListQuerySchema,
  infoQuerySchema,
  issuerQuerySchema,
  issuersListQuerySchema,
  mapQuerySchema,
  marketPairsQuerySchema,
  quotesLatestQuerySchema,
  serializeQuery,
  type AssetsListQuery,
  type InfoQuery,
  type IssuerQuery,
  type IssuersListQuery,
  type MapQuery,
  type MarketPairsQuery,
  type QuotesLatestQuery,
} from "./queries";
import { redactSensitive } from "./redact";
import {
  rwaAssetsListResponseSchema,
  rwaInfoResponseSchema,
  rwaIssuerResponseSchema,
  rwaIssuersListResponseSchema,
  rwaMapResponseSchema,
  rwaMarketPairsResponseSchema,
  rwaQuotesLatestResponseSchema,
  type RwaAssetsListResponse,
  type RwaInfoResponse,
  type RwaIssuerResponse,
  type RwaIssuersListResponse,
  type RwaMapResponse,
  type RwaMarketPairsResponse,
  type RwaQuotesLatestResponse,
} from "./schemas";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;

type Fetch = (input: URL, init: RequestInit) => Promise<Response>;
type Sleep = (milliseconds: number) => Promise<void>;
type CmcEnvelope = { status: { error_code: number } };

export type CmcClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetch?: Fetch;
  sleep?: Sleep;
  random?: () => number;
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
};

export type CmcClient = {
  getRwaMap(query?: MapQuery): Promise<RwaMapResponse>;
  getRwaInfo(query: InfoQuery): Promise<RwaInfoResponse>;
  getRwaAssets(query?: AssetsListQuery): Promise<RwaAssetsListResponse>;
  getRwaMarketPairs(query: MarketPairsQuery): Promise<RwaMarketPairsResponse>;
  getRwaQuotesLatest(
    query: QuotesLatestQuery,
  ): Promise<RwaQuotesLatestResponse>;
  getRwaIssuers(query?: IssuersListQuery): Promise<RwaIssuersListResponse>;
  getRwaIssuer(query: IssuerQuery): Promise<RwaIssuerResponse>;
};

export function createCmcClient(options: CmcClientOptions): CmcClient {
  if (!options.apiKey.trim()) throw new Error("CMC API key is required");

  const baseUrl = new URL(
    options.baseUrl ?? "https://pro-api.coinmarketcap.com",
  );
  if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost") {
    throw new Error("CMC base URL must use HTTPS");
  }

  const fetchImpl = options.fetch ?? globalThis.fetch;
  const sleep =
    options.sleep ??
    ((milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const random = options.random ?? Math.random;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const inFlight = new Map<string, Promise<unknown>>();

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("maxAttempts must be a positive integer");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeoutMs must be positive");
  }

  async function request<T extends CmcEnvelope>(
    path: string,
    query: Record<string, unknown>,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const url = new URL(path, baseUrl);
    url.search = serializeQuery(query).toString();
    const key = url.toString();
    const existing = inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = executeRequest(url, schema).finally(() =>
      inFlight.delete(key),
    );
    inFlight.set(key, promise);
    return promise;
  }

  async function executeRequest<T extends CmcEnvelope>(
    url: URL,
    schema: z.ZodType<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-CMC_PRO_API_KEY": options.apiKey,
          },
          signal: controller.signal,
        });

        let body: unknown;
        try {
          body = await response.json();
        } catch (cause) {
          if (response.ok) {
            throw new CmcApiError({
              code: "CMC_INVALID_RESPONSE",
              message: "CoinMarketCap returned a non-JSON response",
              status: response.status,
              retryable: false,
              attempts: attempt,
              cause,
            });
          }
          body = { message: "Non-JSON upstream error response" };
        }

        if (!response.ok) {
          const retryable = isRetryableStatus(response.status);
          const error = new CmcApiError({
            code: errorCodeForStatus(response.status),
            message: `CoinMarketCap request failed with status ${response.status}`,
            status: response.status,
            retryable,
            attempts: attempt,
            details: redactSensitive(body),
          });

          if (retryable && attempt < maxAttempts) {
            await sleep(retryDelay(response, attempt, baseDelayMs, random));
            continue;
          }
          throw error;
        }

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          throw new CmcApiError({
            code: "CMC_INVALID_RESPONSE",
            message: "CoinMarketCap returned an unexpected response shape",
            status: response.status,
            retryable: false,
            attempts: attempt,
            details: parsed.error.issues,
          });
        }

        if (parsed.data.status.error_code !== 0) {
          throw new CmcApiError({
            code: "CMC_UPSTREAM_ERROR",
            message: "CoinMarketCap returned an unsuccessful API status",
            status: response.status,
            retryable: false,
            attempts: attempt,
            details: redactSensitive(parsed.data.status),
          });
        }

        return parsed.data;
      } catch (error) {
        if (error instanceof CmcApiError) throw error;

        const timedOut = controller.signal.aborted;
        const retryableError = new CmcApiError({
          code: timedOut ? "CMC_TIMEOUT" : "CMC_NETWORK_ERROR",
          message: timedOut
            ? "CoinMarketCap request timed out"
            : "CoinMarketCap network request failed",
          retryable: true,
          attempts: attempt,
          cause: error,
        });

        if (attempt < maxAttempts) {
          await sleep(backoffDelay(attempt, baseDelayMs, random));
          continue;
        }
        throw retryableError;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error("Unreachable CMC request state");
  }

  return {
    getRwaMap(query = {}) {
      return request(
        "/v5/real-world-assets/map",
        mapQuerySchema.parse(query),
        rwaMapResponseSchema,
      );
    },
    getRwaInfo(query) {
      return request(
        "/v5/real-world-assets/info",
        infoQuerySchema.parse(query),
        rwaInfoResponseSchema,
      );
    },
    getRwaAssets(query = {}) {
      return request(
        "/v5/real-world-assets/assets/list",
        assetsListQuerySchema.parse(query),
        rwaAssetsListResponseSchema,
      );
    },
    getRwaMarketPairs(query) {
      return request(
        "/v5/real-world-assets/market-pairs/list",
        marketPairsQuerySchema.parse(query),
        rwaMarketPairsResponseSchema,
      );
    },
    getRwaQuotesLatest(query) {
      return request(
        "/v5/real-world-assets/quotes/latest",
        quotesLatestQuerySchema.parse(query),
        rwaQuotesLatestResponseSchema,
      );
    },
    getRwaIssuers(query = {}) {
      return request(
        "/v5/real-world-assets/issuers/list",
        issuersListQuerySchema.parse(query),
        rwaIssuersListResponseSchema,
      );
    },
    getRwaIssuer(query) {
      return request(
        "/v5/real-world-assets/issuers",
        issuerQuerySchema.parse(query),
        rwaIssuerResponseSchema,
      );
    },
  };
}

function retryDelay(
  response: Response,
  attempt: number,
  baseDelayMs: number,
  random: () => number,
) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  }
  return backoffDelay(attempt, baseDelayMs, random);
}

function backoffDelay(
  attempt: number,
  baseDelayMs: number,
  random: () => number,
) {
  return baseDelayMs * 2 ** (attempt - 1) + Math.floor(random() * 100);
}

let singleton: CmcClient | undefined;

export function getCmcClient(): CmcClient {
  const env = getServerEnv();
  singleton ??= createCmcClient({
    apiKey: env.CMC_API_KEY,
    baseUrl: env.CMC_API_BASE_URL,
  });
  return singleton;
}
