import { expect, test, type Page } from "@playwright/test";

const asset = {
  rwaId: 101,
  name: "Treasury Capacity Note",
  symbol: "TCN",
  slug: "treasury-capacity-note",
  assetType: "government_security",
  rank: 1,
  hasTokens: true,
  quote: {
    currency: "USD",
    averageTokenizedPrice: 100.25,
    tokenizedMarketCap: 10_000_000,
    tokenizedVolume24h: 500_000,
    sourceUpdatedAt: "2026-09-18T02:30:00.000Z",
  },
};

const secondAsset = {
  ...asset,
  rwaId: 102,
  name: "Treasury Capacity Note II",
  symbol: "TCN2",
  slug: "treasury-capacity-note-ii",
  quote: {
    ...asset.quote,
    tokenizedMarketCap: 8_000_000,
    tokenizedVolume24h: 250_000,
  },
};

async function mockRwaApi(page: Page) {
  await page.route(/\/api\/assets\/101(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          asset: {
            ...asset,
            tokens: [
              {
                cryptoId: 40101,
                name: "Example Treasury Token",
                symbol: "EXTBX",
                issuerId: "6878977dcbbf471de3366e85",
                issuerName: "Example Issuer",
                currency: "USD",
                price: 100.25,
                marketCap: 10_000_000,
                volume24h: 500_000,
              },
            ],
            tradfiMarkets: [
              {
                exchangeId: 270,
                exchangeName: "Example Exchange",
                exchangeSlug: "example-exchange",
                ticker: "TCN",
                marketUrl: "https://example.com/markets/tcn",
              },
            ],
          },
          metadata: {
            rwaId: 101,
            website: "https://example.com/assets/tcn",
            employees: 1250,
            founded: "2018",
            industry: "Asset Management",
            cik: "0001234567",
            primaryExchange: "Example Exchange",
            about: {
              description:
                "A tokenized Treasury asset used for capacity analysis.",
              logo: null,
              website: "https://example.com/assets/tcn",
              dateAdded: "2025-07-17T06:29:24.000Z",
            },
          },
          historyCoverage: {
            firstHistoricalData: "2025-01-01T00:00:00.000Z",
            lastHistoricalData: "2026-09-18T00:00:00.000Z",
          },
          marketPairs: null,
          analysis: {
            calculatedAt: "2026-09-18T02:31:00.000Z",
            methodologyVersion: "1.0.0",
            metrics: {
              turnoverRatio: 0.05,
              positionToVolumeRatio: 0.2,
              freshnessAgeMinutes: 1,
              freshnessScore: 100,
            },
            concentration: {
              market: concentration("unavailable"),
              exchange: concentration("unavailable"),
              token: concentration("unavailable"),
              issuer: concentration("unavailable"),
              issuerMappedVolumeCoverage: null,
            },
            priceDispersion: {
              status: "unavailable",
              sampleSize: 0,
              weightedMeanPrice: null,
              weightedAbsoluteDeviation: null,
              robustWeightedMeanPrice: null,
              robustWeightedAbsoluteDeviation: null,
              medianPrice: null,
              medianAbsoluteDeviation: null,
              observations: [],
            },
            evidenceCoverage: {
              score: 55,
              label: "Limited",
              factors: [
                {
                  key: "aggregateQuote",
                  weight: 25,
                  earned: 25,
                  passed: true,
                },
              ],
            },
            marketCapacityHealth: {
              score: 72,
              availableWeight: 60,
              coverage: 0.6,
              status: "available",
              components: [],
            },
            warnings: [],
          },
          sourceStatuses: [],
          dataGaps: [{ source: "marketPairs", code: "SOURCE_UNAVAILABLE" }],
          stale: false,
        },
        meta: {
          requestId: "e2e-detail",
          generatedAt: "2026-09-18T02:31:00.000Z",
          stale: false,
        },
      }),
    });
  });

  await page.route(/\/api\/compare\/universe(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: [asset, secondAsset].map((item) => ({
            rwaId: item.rwaId,
            name: item.name,
            symbol: item.symbol,
            slug: item.slug,
            assetType: item.assetType,
            rank: item.rank,
            hasTokens: item.hasTokens,
          })),
          stale: false,
        },
        meta: {
          requestId: "e2e-compare-universe",
          generatedAt: "2026-09-18T02:31:00.000Z",
          stale: false,
        },
      }),
    });
  });

  await page.route(/\/api\/compare$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: [compareItem(asset, 4), compareItem(secondAsset, 8)],
          failures: [],
          scenario: {
            positionValue: 100_000,
            participationRate: 0.05,
            stressHaircut: 0,
          },
          stale: false,
        },
        meta: {
          requestId: "e2e-compare",
          generatedAt: "2026-09-18T02:31:00.000Z",
          stale: false,
        },
      }),
    });
  });

  await page.route(/\/api\/assets\?.*$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: [
            { ...asset, logo: null, turnoverRatio: 0.05 },
            { ...secondAsset, logo: null, turnoverRatio: 0.03125 },
          ],
          pagination: { totalSize: 2, hasMore: false },
          sourceStatus: sourceStatus,
          stale: false,
        },
        meta: {
          requestId: "e2e-explorer",
          generatedAt: "2026-09-18T02:31:00.000Z",
          stale: false,
        },
      }),
    });
  });

  await page.route(
    /\/api\/issuers\/6878977dcbbf471de3366e85(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            issuer: {
              issuerId: "6878977dcbbf471de3366e85",
              name: "Example Issuer",
              website: "https://example.invalid",
              logo: null,
              tokenCount: 1,
              tokens: [
                {
                  cryptoId: 40101,
                  rwaId: 101,
                  name: "Example Treasury Token",
                  symbol: "EXTBX",
                },
              ],
              linkedTokenTotal: 1,
              hasMore: false,
            },
            sourceStatus: {
              ...sourceStatus,
              source: "issuers",
              evidence: {
                ...sourceStatus.evidence,
                endpoint: "/v5/real-world-assets/issuers",
              },
            },
            stale: false,
          },
          meta: {
            requestId: "e2e-issuer-detail",
            generatedAt: "2026-09-18T02:31:00.000Z",
            stale: false,
          },
        }),
      });
    },
  );

  await page.route(/\/api\/issuers\?.*$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: [
            {
              issuerId: "6878977dcbbf471de3366e85",
              name: "Example Issuer",
              website: "https://example.invalid",
              logo: null,
              tokenCount: 1,
            },
          ],
          pagination: { totalSize: 1, hasMore: false },
          sourceStatus: {
            ...sourceStatus,
            source: "issuers",
            evidence: {
              ...sourceStatus.evidence,
              endpoint: "/v5/real-world-assets/issuers/list",
            },
          },
          stale: false,
        },
        meta: {
          requestId: "e2e-issuers",
          generatedAt: "2026-09-18T02:31:00.000Z",
          stale: false,
        },
      }),
    });
  });
}

test("runs the guided capacity scenario", async ({ page }) => {
  await mockRwaApi(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Can I actually exit this position?",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Treasury Capacity Note" }),
  ).toBeVisible();
  await expect(page.getByText("4", { exact: true })).toBeVisible();
  await expect(page.getByText("3–7 days", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: "Volume participation", exact: true })
    .focus();
  await expect(page.getByRole("tooltip")).toContainText(
    "percentage of effective 24-hour volume",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).not.toBeVisible();

  await page.getByRole("button", { name: "1%", exact: true }).click();
  await expect(page.getByText("20", { exact: true })).toBeVisible();
  await expect(page.getByText("Over 7 days", { exact: true })).toBeVisible();
  await expect(page.getByText(/not a promise of execution/i)).toBeVisible();
});

test("keeps the redesigned landing usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockRwaApi(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Can I actually exit this position?",
    }),
  ).toBeVisible();
  await expect(page.getByText("Live scenario terminal")).toBeVisible();
  await page
    .getByRole("button", { name: "Tokenized market cap", exact: true })
    .click();
  await expect(
    page.locator('[role="tooltip"].fx-term-card-visible'),
  ).toContainText("does not guarantee active trading");
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

test("presents the methodology and guardrails on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/methodology");

  await expect(page.locator('a[href="/methodology"]').first()).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator('a[href="/assets"]').first()).not.toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("heading", { name: "Methodology under the X-Ray" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Capacity model" }),
  ).toBeVisible();
  const missingDataTerm = page.getByRole("button", {
    name: "Missing ≠ zero",
    exact: true,
  });
  await expect(missingDataTerm).toBeVisible();
  await missingDataTerm.click();
  await expect(
    page.locator('[role="tooltip"].fx-term-card-visible'),
  ).toContainText("unavailable input");
  await expect(
    page.getByRole("heading", {
      name: "What the analysis does not claim",
    }),
  ).not.toBeVisible();
  await page.getByRole("tab", { name: /Interpretation limits/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "What the analysis does not claim",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Capacity model" }),
  ).not.toBeVisible();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("heading", { name: "Capacity model" }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

test("compares assets under one shared scenario", async ({ page }) => {
  await mockRwaApi(page);
  await page.goto("/compare");

  await expect(
    page.getByRole("heading", { name: "Compare market capacity" }),
  ).toBeVisible();
  await expect(page.getByText("2/4 selected")).toBeVisible();
  await page.getByRole("button", { name: "Run comparison" }).click();
  await expect(
    page.getByRole("heading", { name: "Scenario comparison" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Treasury Capacity Note II" }),
  ).toBeVisible();
  await expect(page.getByText("3–7 days", { exact: true })).toBeVisible();
  await expect(page.getByText("Over 7 days", { exact: true })).toBeVisible();
  await expect(page.getByText(/not a “best asset” ranking/i)).toBeVisible();

  await page
    .getByRole("button", { name: "Estimated exit days", exact: true })
    .first()
    .click();
  await expect(
    page.locator('[role="tooltip"].fx-term-card-visible'),
  ).toContainText("number of 24-hour periods");

  await page
    .getByRole("button", { name: "1 evidence gap", exact: true })
    .first()
    .click();
  await expect(
    page.locator('[role="tooltip"].fx-term-card-visible'),
  ).toContainText("Market-pair data is unavailable");
});

test("keeps the redesigned Compare workflow usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockRwaApi(page);
  await page.goto("/compare");

  await expect(
    page.getByRole("heading", { name: "Compare market capacity" }),
  ).toBeVisible();
  await expect(
    page.getByText("Selected", { exact: true }).first(),
  ).toBeVisible();
  await page.getByPlaceholder("Search symbol or top asset name").fill("TCN2");
  await expect(
    page.getByText("Selected", { exact: true }).first(),
  ).toBeVisible();
  await page
    .locator("label")
    .filter({ hasText: "TCN2" })
    .getByRole("checkbox")
    .evaluate((checkbox) => (checkbox as HTMLInputElement).click());
  await expect(page.getByText("1/4 selected")).toBeVisible();
  await page
    .locator("label")
    .filter({ hasText: "TCN2" })
    .getByRole("checkbox")
    .evaluate((checkbox) => (checkbox as HTMLInputElement).click());
  await expect(page.getByText("2/4 selected")).toBeVisible();
  await page
    .getByRole("button", { name: "Select assets", exact: true })
    .click();
  await expect(
    page.locator('[role="tooltip"].fx-term-card-visible'),
  ).toContainText("two to four canonical RWA assets");
  await page.getByRole("button", { name: "Run comparison" }).click();
  await expect(
    page.getByRole("dialog", { name: "Processing comparison" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Scenario comparison" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Processing comparison" }),
  ).not.toBeVisible();
  await expect(page.getByText("Market Capacity Health").first()).toBeVisible();
  await expect(page.getByText("Evidence Coverage").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Top market share", exact: true })
    .first()
    .click();
  await expect(
    page.locator('[role="tooltip"].fx-term-card-visible'),
  ).toContainText("largest market");
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

test("keeps the redesigned Explorer usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockRwaApi(page);
  await page.goto("/assets");

  await expect(
    page.getByRole("heading", { name: "Asset Explorer" }),
  ).toBeVisible();
  const registryTerm = page.getByRole("button", {
    name: "Asset registry",
    exact: true,
  });
  await expect(registryTerm).toBeVisible();
  await registryTerm.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "current paginated list",
  );
  await page
    .getByRole("button", { name: "Page market cap", exact: true })
    .click();
  await expect(
    page.locator('[role="tooltip"].fx-term-card-visible'),
  ).toContainText("current server-paginated page");
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

test("filters and opens a live Explorer row", async ({ page }) => {
  await mockRwaApi(page);
  await page.goto("/assets");

  await expect(
    page.getByRole("heading", { name: "Asset Explorer" }),
  ).toBeVisible();
  await expect(page.getByText("Treasury Capacity Note").first()).toBeVisible();

  await page.getByPlaceholder("Search name or symbol").fill("missing");
  await expect(
    page.getByRole("heading", { name: "No match on this page" }),
  ).toBeVisible();

  await page.getByPlaceholder("Search name or symbol").fill("");
  await page.getByRole("link", { name: "Open X-Ray" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Treasury Capacity Note", level: 1 }),
  ).toBeVisible();
  const averagePriceTerm = page.getByRole("button", {
    name: "Average tokenized price",
    exact: true,
  });
  await expect(averagePriceTerm).toBeVisible();
  await averagePriceTerm.click();
  await expect(
    page.locator('[role="tooltip"].fx-term-card-visible'),
  ).toContainText("aggregate USD price");
  await expect(
    page.getByRole("link", { name: "Asset website" }),
  ).toHaveAttribute("href", "https://example.com/assets/tcn");
  await expect(page.getByText("1,250")).toBeVisible();
  await expect(page.getByRole("link", { name: /0001234567/ })).toHaveAttribute(
    "href",
    "https://www.sec.gov/edgar/browse/?CIK=0001234567",
  );
  await expect(page.getByText("Token records available")).toBeVisible();
  await expect(page.getByText(/Jan 1, 2025/)).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "CMC latest history", exact: true })
      .locator("xpath=ancestor::div[1]"),
  ).toContainText("2026");
  await expect(
    page.getByRole("heading", { name: "Exit Capacity Simulator" }),
  ).not.toBeVisible();
  await page.getByRole("tab", { name: "Simulator" }).click();
  await expect(
    page.getByRole("heading", { name: "Exit Capacity Simulator" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Concentration" }).click();
  await expect(
    page.getByRole("heading", { name: "Concentration X-Ray" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Exit Capacity Simulator" }),
  ).not.toBeVisible();
  await expect(page.getByText(/Partial evidence/)).toBeVisible();
  await page.getByRole("tab", { name: "Markets" }).click();
  await expect(
    page.getByRole("heading", { name: "TradFi markets" }),
  ).toBeVisible();
  await expect(page.getByText("Example Exchange")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Example Issuer" }),
  ).toHaveAttribute("href", "/issuers/6878977dcbbf471de3366e85");
  await expect(page.getByRole("link", { name: "Open market" })).toHaveAttribute(
    "href",
    "https://example.com/markets/tcn",
  );
});

test("opens an issuer and traces its token to an RWA asset", async ({
  page,
}) => {
  await mockRwaApi(page);
  await page.goto("/issuers");

  await expect(
    page.getByRole("heading", { name: "Issuer Directory" }),
  ).toBeVisible();
  await expect(page.getByText("Example Issuer")).toBeVisible();
  await page.getByRole("link", { name: "View issuer" }).click();

  await expect(
    page.getByRole("heading", { name: "Example Issuer", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Example Treasury Token")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open X-Ray" })).toHaveAttribute(
    "href",
    "/assets/101",
  );
  await expect(
    page.getByRole("link", { name: "Issuers", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("keeps tabbed Asset X-Ray usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockRwaApi(page);
  await page.goto("/assets/101");

  await expect(
    page.getByRole("heading", { name: "Treasury Capacity Note", level: 1 }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Evidence" }).click();
  await expect(
    page.getByRole("heading", { name: "Evidence summary" }),
  ).toBeVisible();
  await expect(page.getByText("Asset context")).not.toBeVisible();
  await page.keyboard.press("Home");
  await expect(page.getByText("Asset context")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

function compareItem(item: typeof asset, estimatedExitDays: number) {
  return {
    asset: item,
    analysis: {
      scenario: {
        status: "available",
        effectiveVolume: item.quote.tokenizedVolume24h,
        dailyCapacity: item.quote.tokenizedVolume24h * 0.05,
        estimatedExitDays,
        planningHorizon:
          estimatedExitDays < 1
            ? "under_one_day"
            : estimatedExitDays <= 3
              ? "one_to_three_days"
              : estimatedExitDays <= 7
                ? "three_to_seven_days"
                : "over_seven_days",
        positionToVolumeRatio: estimatedExitDays * 0.05,
      },
      metrics: { turnoverRatio: 0.05, freshnessAgeMinutes: 1 },
      concentration: {
        market: concentration("unavailable"),
        exchange: concentration("unavailable"),
        token: concentration("unavailable"),
        issuer: concentration("unavailable"),
        issuerMappedVolumeCoverage: null,
      },
      evidenceCoverage: { score: 55, label: "Limited" },
      marketCapacityHealth: {
        score: 72,
        status: "available",
      },
    },
    dataGaps: [{ source: "marketPairs", code: "SOURCE_UNAVAILABLE" }],
    stale: false,
  };
}

function concentration(status: "available" | "unavailable") {
  return {
    status,
    sampleSize: 0,
    totalVolume: 0,
    top1Share: null,
    top3Share: null,
    hhi: null,
    normalizedHhi: null,
  };
}

const sourceStatus = {
  source: "assets",
  evidence: {
    provider: "coinmarketcap",
    endpoint: "/v5/real-world-assets/assets/list",
    responseTimestamp: "2026-09-18T02:31:00.000Z",
    observedAt: "2026-09-18T02:31:00.000Z",
    creditCount: 1,
    notice: null,
  },
  normalizationWarnings: [],
  cache: {
    state: "fresh",
    observedAt: "2026-09-18T02:31:00.000Z",
    expiresAt: "2026-09-18T02:32:00.000Z",
    staleUntil: "2026-09-19T02:31:00.000Z",
    warning: null,
  },
  refreshErrorCode: null,
};
