import { describe, expect, it } from "vitest";

import assetsListFixture from "../../../tests/fixtures/cmc/rwa-assets-list.json";
import infoFixture from "../../../tests/fixtures/cmc/rwa-info.json";
import issuerFixture from "../../../tests/fixtures/cmc/rwa-issuer.json";
import issuersListFixture from "../../../tests/fixtures/cmc/rwa-issuers-list.json";
import mapFixture from "../../../tests/fixtures/cmc/rwa-map.json";
import marketPairsFixture from "../../../tests/fixtures/cmc/rwa-market-pairs.json";
import quotesLatestFixture from "../../../tests/fixtures/cmc/rwa-quotes-latest.json";
import {
  normalizeRwaAssetsList,
  normalizeRwaInfo,
  normalizeRwaIssuer,
  normalizeRwaIssuersList,
  normalizeRwaMap,
  normalizeRwaMarketPairs,
  normalizeRwaQuotesLatest,
} from "./normalize";
import {
  rwaAssetsListResponseSchema,
  rwaInfoResponseSchema,
  rwaIssuerResponseSchema,
  rwaIssuersListResponseSchema,
  rwaMapResponseSchema,
  rwaMarketPairsResponseSchema,
  rwaQuotesLatestResponseSchema,
} from "./schemas";

const observedAt = new Date("2026-09-09T07:00:00.000Z");

describe("CMC normalization", () => {
  it("normalizes all seven response types into stable domain models", () => {
    const normalized = [
      normalizeRwaMap(rwaMapResponseSchema.parse(mapFixture), { observedAt }),
      normalizeRwaInfo(rwaInfoResponseSchema.parse(infoFixture), {
        observedAt,
      }),
      normalizeRwaAssetsList(
        rwaAssetsListResponseSchema.parse(assetsListFixture),
        { observedAt },
      ),
      normalizeRwaMarketPairs(
        rwaMarketPairsResponseSchema.parse(marketPairsFixture),
        { observedAt },
      ),
      normalizeRwaQuotesLatest(
        rwaQuotesLatestResponseSchema.parse(quotesLatestFixture),
        { observedAt },
      ),
      normalizeRwaIssuersList(
        rwaIssuersListResponseSchema.parse(issuersListFixture),
        { observedAt },
      ),
      normalizeRwaIssuer(rwaIssuerResponseSchema.parse(issuerFixture), {
        observedAt,
      }),
    ];

    expect(normalized.map((result) => result.evidence.endpoint)).toEqual([
      "/v5/real-world-assets/map",
      "/v5/real-world-assets/info",
      "/v5/real-world-assets/assets/list",
      "/v5/real-world-assets/market-pairs/list",
      "/v5/real-world-assets/quotes/latest",
      "/v5/real-world-assets/issuers/list",
      "/v5/real-world-assets/issuers",
    ]);
    expect(
      normalized.every(
        (result) => result.evidence.observedAt === observedAt.toISOString(),
      ),
    ).toBe(true);
    expect(normalized.every((result) => result.warnings.length === 0)).toBe(
      true,
    );
  });

  it("accepts the live CMC status variants without weakening the domain type", () => {
    const parsed = rwaMapResponseSchema.parse({
      ...mapFixture,
      status: {
        timestamp: mapFixture.status.timestamp,
        error_code: "0",
        error_message: mapFixture.status.error_message,
        elapsed: mapFixture.status.elapsed,
        credit_count: mapFixture.status.credit_count,
      },
    });

    const result = normalizeRwaMap(parsed, { observedAt });
    expect(parsed.status.error_code).toBe(0);
    expect(result.evidence.notice).toBeNull();
  });

  it("preserves an issuer token with no RWA mapping as an evidence gap", () => {
    const parsed = rwaIssuerResponseSchema.parse({
      ...issuerFixture,
      data: {
        ...issuerFixture.data,
        tokens: [{ ...issuerFixture.data.tokens[0], rwa_id: null }],
      },
    });

    expect(
      normalizeRwaIssuer(parsed, { observedAt }).data.tokens[0]?.rwaId,
    ).toBeNull();
  });

  it("excludes upstream assets without a canonical RWA ID", () => {
    const parsed = rwaAssetsListResponseSchema.parse({
      ...assetsListFixture,
      data: {
        ...assetsListFixture.data,
        rwa_assets: [
          assetsListFixture.data.rwa_assets[0],
          {
            ...assetsListFixture.data.rwa_assets[0],
            rwa_id: null,
            has_tokens: null,
          },
        ],
      },
    });

    const result = normalizeRwaAssetsList(parsed, { observedAt });
    expect(result.data.items).toHaveLength(1);
    expect(result.warnings).toContainEqual({
      code: "INVALID_ASSET_EXCLUDED",
      path: "data.rwa_assets[1].rwa_id",
      message: "An upstream asset without a canonical RWA ID was excluded",
    });
  });

  it("keeps a quote asset while excluding malformed token rows", () => {
    const firstAsset = quotesLatestFixture.data.rwa_assets[0]!;
    const parsed = rwaQuotesLatestResponseSchema.parse({
      ...quotesLatestFixture,
      data: {
        ...quotesLatestFixture.data,
        rwa_assets: [
          {
            ...firstAsset,
            tokens: [
              ...firstAsset.tokens,
              {
                ...firstAsset.tokens[0],
                crypto_id: 49999,
                name: null,
                symbol: null,
              },
            ],
          },
        ],
      },
    });

    const result = normalizeRwaQuotesLatest(parsed, { observedAt });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.tokens).toHaveLength(firstAsset.tokens.length);
    expect(result.warnings).toContainEqual({
      code: "INVALID_TOKEN_EXCLUDED",
      path: `data.rwa_assets[0].tokens[${firstAsset.tokens.length}]`,
      message: "An upstream token without a name or symbol was excluded",
    });
  });

  it("maps snake_case fields and excludes passthrough fields", () => {
    const parsed = rwaAssetsListResponseSchema.parse({
      ...assetsListFixture,
      data: {
        ...assetsListFixture.data,
        private_debug_field: "must-not-leak",
        rwa_assets: assetsListFixture.data.rwa_assets.map((asset) => ({
          ...asset,
          undocumented_field: "must-not-leak",
        })),
      },
    });

    const result = normalizeRwaAssetsList(parsed, { observedAt });
    expect(result.data.items[0]).toMatchObject({
      rwaId: 101,
      assetType: "government_security",
      quote: {
        currency: "USD",
        averageTokenizedPrice: 100.25,
      },
    });
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });

  it("preserves explicit zero and null instead of treating them as missing", () => {
    const parsed = rwaAssetsListResponseSchema.parse({
      ...assetsListFixture,
      data: {
        ...assetsListFixture.data,
        rwa_assets: [
          {
            ...assetsListFixture.data.rwa_assets[0],
            average_tokenized_price: 0,
            tokenized_market_cap: null,
            tokenized_volume_24h: 0,
          },
        ],
      },
    });

    const quote = normalizeRwaAssetsList(parsed, { observedAt }).data.items[0]
      ?.quote;
    expect(quote).toEqual({
      currency: "USD",
      averageTokenizedPrice: 0,
      tokenizedMarketCap: null,
      tokenizedVolume24h: 0,
      sourceUpdatedAt: "2026-09-09T06:49:59.000Z",
    });
  });

  it("does not replace an explicit null aggregate with a nested quote value", () => {
    const parsed = rwaAssetsListResponseSchema.parse({
      ...assetsListFixture,
      data: {
        ...assetsListFixture.data,
        rwa_assets: [
          {
            ...assetsListFixture.data.rwa_assets[0],
            tokenized_market_cap: null,
          },
        ],
      },
    });

    expect(
      normalizeRwaAssetsList(parsed, { observedAt }).data.items[0]?.quote
        .tokenizedMarketCap,
    ).toBeNull();
  });

  it("reports missing USD market quotes without dropping the pair", () => {
    const parsed = rwaMarketPairsResponseSchema.parse({
      ...marketPairsFixture,
      data: {
        ...marketPairsFixture.data,
        market_pairs: marketPairsFixture.data.market_pairs.map((pair) => ({
          ...pair,
          quotes: [],
        })),
      },
    });

    const result = normalizeRwaMarketPairs(parsed, { observedAt });
    expect(result.data.pairs).toHaveLength(1);
    expect(result.data.pairs[0]?.marketQuote).toMatchObject({
      currency: "USD",
      price: null,
      volume24h: null,
    });
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "USD_QUOTE_MISSING" }),
    );
  });

  it("normalizes valid timestamps and flags invalid source timestamps", () => {
    const parsed = rwaMapResponseSchema.parse({
      ...mapFixture,
      data: {
        ...mapFixture.data,
        rwa_assets: [
          {
            ...mapFixture.data.rwa_assets[0],
            first_historical_data: "not-a-timestamp",
          },
        ],
      },
    });

    const result = normalizeRwaMap(parsed, { observedAt });
    expect(result.data.items[0]?.firstHistoricalData).toBeNull();
    expect(result.data.items[0]?.lastHistoricalData).toBe(
      "2026-09-09T00:00:00.000Z",
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "INVALID_TIMESTAMP",
        path: "data.rwa_assets[0].first_historical_data",
      }),
    );
  });

  it("preserves missing pagination metadata as null", () => {
    const original = structuredClone(mapFixture);
    const fixture = {
      ...original,
      data: { rwa_assets: original.data.rwa_assets },
    };

    const result = normalizeRwaMap(rwaMapResponseSchema.parse(fixture), {
      observedAt,
    });
    expect(result.data.totalSize).toBeNull();
    expect(result.data.hasMore).toBeNull();
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "PAGINATION_METADATA_MISSING" }),
    );
  });

  it("rejects an invalid observation timestamp supplied by the application", () => {
    const parsed = rwaMapResponseSchema.parse(mapFixture);
    expect(() =>
      normalizeRwaMap(parsed, { observedAt: new Date("invalid") }),
    ).toThrow("observedAt must be a valid Date");
  });
});
