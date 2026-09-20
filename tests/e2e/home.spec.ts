import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

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
          marketPairs: {
            rwaId: 101,
            name: "Treasury Capacity Note",
            symbol: "TCN",
            reportedPairCount: 12,
            pairs: Array.from({ length: 12 }, (_, index) =>
              marketPair(index + 1),
            ),
            totalSize: 12,
            hasMore: false,
          },
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
            tokenizedMarketCap: item.quote.tokenizedMarketCap,
            tokenizedVolume24h: item.quote.tokenizedVolume24h,
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
  await expectNoA11yViolations(page);
});

test("publishes canonical SEO and crawler metadata", async ({ page }) => {
  await mockRwaApi(page);
  await page.goto("/");

  await expect(page).toHaveTitle("RWA X-Ray — Tokenized Asset Market Capacity");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://rwa-xray.vercel.app",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /market-capacity scenarios/i,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "RWA X-Ray — Tokenized Asset Market Capacity",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );

  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(jsonLd ?? "{}")).toMatchObject({
    "@type": "WebApplication",
    name: "RWA X-Ray",
    isAccessibleForFree: true,
  });

  const socialImageUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(socialImageUrl).toBeTruthy();
  const socialImage = await page.request.get(socialImageUrl!);
  expect(socialImage.ok()).toBe(true);
  expect(socialImage.headers()["content-type"]).toContain("image/png");

  const iconUrl = await page
    .locator('link[rel="icon"][type="image/png"]')
    .getAttribute("href");
  expect(iconUrl).toBeTruthy();
  const icon = await page.request.get(iconUrl!);
  expect(icon.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toContain("image/png");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "sizes",
    "180x180",
  );

  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /api/");
  const sitemap = await page.request.get("/sitemap.xml");
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain("https://rwa-xray.vercel.app/assets");
  expect(sitemapBody).toContain("https://rwa-xray.vercel.app/methodology");
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
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("link", { name: "Compare", exact: true }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  await expectNoA11yViolations(page);
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
  await expectNoA11yViolations(page);
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
  await page.keyboard.press("Escape");
  await expectNoA11yViolations(page);
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
  await expect(async () => {
    const selectedTcn2 = page
      .locator("label")
      .filter({ hasText: "TCN2" })
      .getByRole("checkbox");
    if (await selectedTcn2.isChecked())
      await selectedTcn2.click({ force: true });
    await expect(page.getByText("1/4 selected")).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 10_000 });
  await expect(async () => {
    const candidateTcn2 = page
      .locator("label")
      .filter({ hasText: "TCN2" })
      .getByRole("checkbox");
    if (!(await candidateTcn2.isChecked()))
      await candidateTcn2.click({ force: true });
    await expect(page.getByText("2/4 selected")).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 10_000 });
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
  await expectNoA11yViolations(page);
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
  const cacheStatus = page.getByRole("button", {
    name: "Cache fresh",
    exact: true,
  });
  await expect(cacheStatus).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Observed Sep 18, 2026, 2:31 AM UTC/,
    }),
  ).toBeVisible();
  await cacheStatus.click();
  await expect(
    page.locator('[role="tooltip"].fx-term-card-visible'),
  ).toContainText("valid cached response was served");
  await page.keyboard.press("Escape");
  await registryTerm.hover();
  await expect(
    page.getByRole("tooltip", { name: /Asset registry/ }),
  ).toContainText("current paginated list");
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
  await expectNoA11yViolations(page);
});

test("renders empty, stale, rate-limit, and upstream failure states", async ({
  page,
}) => {
  let state: "empty" | "stale" | "rate-limit" | "upstream" = "empty";
  await page.route(/\/api\/assets\?.*$/, async (route) => {
    if (state === "rate-limit" || state === "upstream") {
      const rateLimited = state === "rate-limit";
      await route.fulfill({
        status: rateLimited ? 429 : 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: rateLimited ? "RATE_LIMITED" : "UPSTREAM_UNAVAILABLE",
            message: rateLimited
              ? "Too many requests"
              : "Market data is temporarily unavailable",
            retryable: true,
          },
          meta: { requestId: `e2e-${state}` },
        }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items:
            state === "empty"
              ? []
              : [{ ...asset, logo: null, turnoverRatio: 0.05 }],
          pagination: {
            totalSize: state === "empty" ? 0 : 1,
            hasMore: false,
          },
          sourceStatus: {
            ...sourceStatus,
            cache: {
              ...sourceStatus.cache,
              state: state === "stale" ? "stale" : "fresh",
            },
            refreshErrorCode: state === "stale" ? "CMC_TIMEOUT" : null,
          },
          stale: state === "stale",
        },
        meta: {
          requestId: `e2e-${state}`,
          generatedAt: "2026-09-18T02:31:00.000Z",
          stale: state === "stale",
        },
      }),
    });
  });

  await page.goto("/assets");
  await expect(
    page.getByRole("heading", { name: "No assets returned" }),
  ).toBeVisible();

  state = "stale";
  await page.reload();
  await expect(
    page.getByText(/Showing the latest real cached dataset/),
  ).toBeVisible();

  state = "rate-limit";
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Refresh limit reached" }),
  ).toBeVisible();

  state = "upstream";
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "RWA universe unavailable" }),
  ).toBeVisible();
});

test("preserves available Compare results during a partial failure", async ({
  page,
}) => {
  await mockRwaApi(page);
  await page.route(/\/api\/compare$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: [compareItem(asset, 4)],
          failures: [
            { rwaId: secondAsset.rwaId, code: "REQUIRED_SOURCE_UNAVAILABLE" },
          ],
          scenario: {
            positionValue: 100_000,
            participationRate: 0.05,
            stressHaircut: 0,
          },
          stale: false,
        },
        meta: {
          requestId: "e2e-compare-partial",
          generatedAt: "2026-09-18T02:31:00.000Z",
          stale: false,
        },
      }),
    });
  });

  await page.goto("/compare");
  await page.getByRole("button", { name: "Run comparison" }).click();
  await expect(
    page.getByRole("heading", { name: "Scenario comparison" }),
  ).toBeVisible();
  await expect(
    page.getByText(/1 requested asset\(s\) could not be compared/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Treasury Capacity Note",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Comparison unavailable")).toBeVisible();
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
  await expect(page).toHaveTitle("RWA Asset #101 Market Capacity | RWA X-Ray");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://rwa-xray.vercel.app/assets/101",
  );
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
    page.getByRole("tab", { name: /Underlying tokens/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "Underlying tokens" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "TradFi markets" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "Example Issuer" }),
  ).toHaveAttribute("href", "/issuers/6878977dcbbf471de3366e85");
  await expect(page.getByRole("button", { name: /Sort by/ })).toHaveCount(4);
  await page.getByRole("button", { name: /Sort by Price/ }).click();
  await expect(
    page.getByRole("button", { name: /Sort by Price/ }).locator("xpath=.."),
  ).toHaveAttribute("aria-sort", "ascending");

  await page.getByRole("tab", { name: /TradFi markets/ }).click();
  await expect(
    page.getByRole("heading", { name: "TradFi markets" }),
  ).toBeVisible();
  await expect(page.getByText("Example Exchange")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open market" })).toHaveAttribute(
    "href",
    "https://example.com/markets/tcn",
  );
  await expect(page.getByRole("button", { name: /Sort by/ })).toHaveCount(3);
  await page.getByRole("button", { name: /Sort by Ticker/ }).click();
  await expect(
    page.getByRole("button", { name: /Sort by Ticker/ }).locator("xpath=.."),
  ).toHaveAttribute("aria-sort", "ascending");

  await page.getByRole("tab", { name: /Market pairs/ }).click();
  const pairTable = page.getByRole("table");
  await expect(pairTable.getByRole("row")).toHaveCount(11);
  await expect(pairTable.getByRole("row").nth(1)).toContainText("TCN-12/USD");
  for (const label of ["Pair", "Exchange", "Price"]) {
    const sortButton = page.getByRole("button", {
      name: new RegExp(`Sort by ${label}`),
    });
    await sortButton.click();
    await expect(sortButton.locator("xpath=..")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await sortButton.click();
    await expect(sortButton.locator("xpath=..")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  }
  await page.getByRole("button", { name: /Sort by 24h volume/ }).click();
  await expect(pairTable.getByRole("row").nth(1)).toContainText("TCN-1/USD");
  await page.getByRole("button", { name: "Next page of market pairs" }).click();
  await expect(page.getByText("Showing 11–12 of 12")).toBeVisible();
  await expect(pairTable.getByRole("row")).toHaveCount(3);
  await expectNoA11yViolations(page);
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
  await expectNoA11yViolations(page);
  await page.getByRole("link", { name: "View issuer" }).click();

  await expect(
    page.getByRole("heading", { name: "Example Issuer", level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveTitle("RWA Issuer 6878977d | RWA X-Ray");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://rwa-xray.vercel.app/issuers/6878977dcbbf471de3366e85",
  );
  await expect(page.getByText("Example Treasury Token")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open X-Ray" })).toHaveAttribute(
    "href",
    "/assets/101",
  );
  await expect(
    page.getByRole("link", { name: "Issuers", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expectNoA11yViolations(page);
});

test("supports the Explorer to Asset X-Ray flow with keyboard only", async ({
  page,
}) => {
  await mockRwaApi(page);
  await page.goto("/");

  const explorerLink = page
    .getByRole("link", { name: "Explorer", exact: true })
    .first();
  await tabTo(page, explorerLink);
  await expectFocusIndicator(explorerLink);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/assets$/);

  const search = page.getByPlaceholder("Search name or symbol");
  await tabTo(page, search);
  await expectFocusIndicator(search);
  await page.keyboard.type("missing");
  await expect(
    page.getByRole("heading", { name: "No match on this page" }),
  ).toBeVisible();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");

  const openXray = page.getByRole("link", { name: "Open X-Ray" }).first();
  await tabTo(page, openXray);
  await expectFocusIndicator(openXray);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/assets\/101$/);

  const overviewTab = page.getByRole("tab", { name: "Overview" });
  await tabTo(page, overviewTab);
  await expectFocusIndicator(overviewTab);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Simulator" })).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Exit Capacity Simulator" }),
  ).toBeVisible();
});

test("keeps credentials and upstream hosts out of browser traffic and logs", async ({
  page,
}) => {
  await mockRwaApi(page);
  const findings: string[] = [];
  const forbidden =
    /(pro-api\.coinmarketcap\.com|x-cmc-pro-api-key|cmc_api_key|database_url|postgres(?:ql)?:\/\/|gemini_api_key|sentry_dsn)/i;

  page.on("request", (request) => {
    const inspected = JSON.stringify({
      url: request.url(),
      headers: request.headers(),
      postData: request.postData(),
    });
    if (forbidden.test(inspected)) findings.push(`request:${request.url()}`);
  });
  page.on("console", (message) => {
    if (forbidden.test(message.text()))
      findings.push(`console:${message.type()}`);
  });

  await page.goto("/assets");
  await expect(page.getByText("Treasury Capacity Note").first()).toBeVisible();
  await page.getByRole("link", { name: "Open X-Ray" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Treasury Capacity Note", level: 1 }),
  ).toBeVisible();
  expect(findings).toEqual([]);
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

  await page.getByRole("tab", { name: "Markets" }).click();
  const underlyingTab = page.getByRole("tab", { name: /Underlying tokens/ });
  await expect(underlyingTab).toHaveAttribute("aria-selected", "true");
  await underlyingTab.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("tab", { name: /TradFi markets/ }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("tab", { name: /Market pairs/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(11);

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  await expectNoA11yViolations(page);
});

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    results.violations,
    results.violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
      )
      .join("\n"),
  ).toEqual([]);
}

async function tabTo(page: Page, target: Locator, maximumTabs = 60) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
  }
  throw new Error("Keyboard target was not reached within the tab limit");
}

async function expectFocusIndicator(target: Locator) {
  const visible = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return (
      (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2) ||
      style.boxShadow !== "none"
    );
  });
  expect(visible).toBe(true);
}

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

function marketPair(index: number) {
  return {
    marketId: 9000 + index,
    marketPair: `TCN-${index}/USD`,
    category: "spot",
    feeType: null,
    exchange: {
      id: 500 + index,
      name: `Exchange ${index}`,
      slug: `exchange-${index}`,
    },
    base: {
      cryptoId: 40_000 + index,
      symbol: `TCN${index}`,
      exchangeSymbol: null,
      currencyType: "cryptocurrency",
    },
    quote: {
      cryptoId: 2781,
      symbol: "USD",
      exchangeSymbol: null,
      currencyType: "fiat",
    },
    marketQuote: {
      currency: "USD",
      price: 100 + index / 100,
      volume24h: index * 1_000,
      sourceUpdatedAt: "2026-09-18T02:30:00.000Z",
    },
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
