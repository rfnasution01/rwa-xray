# Final UX, accessibility, and release audit

Audit date: 2026-09-20

## Scope and evidence

| Area                | Evidence                                                                                       | Result                                         |
| ------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Desktop             | Chromium desktop flows for landing, Explorer, Asset X-Ray, Compare, and Issuers                | Passed locally                                 |
| Mobile              | 390 × 844 viewport, horizontal-overflow assertions, tooltip and tab interactions               | Passed locally                                 |
| Keyboard only       | Landing → Explorer → search → Asset X-Ray → tab navigation without pointer input               | Passed locally                                 |
| WCAG automated scan | Axe WCAG 2 A/AA and WCAG 2.1 A/AA on primary desktop/mobile views                              | Passed after remediations                      |
| Focus               | Keyboard targets require a visible outline or focus shadow                                     | Passed locally                                 |
| Failure states      | Empty, stale, 429, upstream/timeout-equivalent 503, and Compare partial failure                | Passed with deterministic API mocks            |
| Browser safety      | Browser request URL/header/body and console scan for upstream hosts and credential identifiers | Passed locally                                 |
| Live infrastructure | Seven CMC endpoints plus PostgreSQL write/read/delete through `pnpm verify:live`               | Passed                                         |
| Production release  | Database readiness and Market Pairs release gate                                               | Pending deployment of the latest local commits |

The mobile checks use browser emulation, not a claim of testing every physical device or assistive-technology combination. A final physical-device and screen-reader spot check remains recommended before submission.

## Accessibility remediations

The audit identified and fixed:

- a mobile header CTA without an accessible name;
- an invalid definition-list structure in the guided result metrics;
- muted text colors below the WCAG AA 4.5:1 threshold;
- low-contrast table headers and secondary table labels;
- missing repeatable automated checks for keyboard flow and WCAG rules.

Tooltips remain accessible by hover, click, and keyboard focus, close with Escape, and respect reduced-motion behavior. Tab interfaces use `tablist`, `tab`, `tabpanel`, roving `tabIndex`, arrow keys, Home, and End.

## Failure-state review

- **Empty:** Explorer distinguishes an empty upstream selection from a current-page search miss.
- **Stale:** only the latest real cached dataset is shown, with an explicit stale warning.
- **429:** rate limiting receives distinct copy and a retry action.
- **Timeout/upstream failure:** no synthetic rows are substituted; the UI shows the upstream-unavailable state and retry action.
- **Partial failure:** Compare keeps valid results visible and renders unavailable requested assets separately.
- **Missing evidence:** unavailable metrics remain unavailable rather than becoming zero.

## Credential and browser-network review

The browser calls only internal `/api/*` routes. Automated checks reject browser requests or console output containing:

- `pro-api.coinmarketcap.com`;
- `X-CMC_PRO_API_KEY` or `CMC_API_KEY`;
- `DATABASE_URL` or PostgreSQL connection strings;
- `GEMINI_API_KEY`;
- `SENTRY_DSN`.

The production smoke harness separately rejects forbidden response field names. This is defense in depth and does not replace reviewing DevTools on the final deployed build.

## Live credit and latency sample

One sequential live sample was taken without logging payloads or credentials:

| CMC endpoint         |      Latency | Credits |
| -------------------- | -----------: | ------: |
| `/map`               |       597 ms |       0 |
| `/info`              |       314 ms |       1 |
| `/assets/list`       |       314 ms |       1 |
| `/market-pairs/list` |       345 ms |       1 |
| `/quotes/latest`     |       314 ms |       1 |
| `/issuers/list`      |       328 ms |       1 |
| `/issuers`           |       320 ms |       1 |
| **Sequential total** | **2,532 ms** |   **6** |

This is a single network sample, not a latency SLA. Application caching, batching, request deduplication, and bounded Compare discovery reduce repeated calls and credit use. Continue monitoring `credit_count`, endpoint latency, cache state, and stale fallback in production.

## Final deployment checks

After the latest commits are deployed:

1. Run **Production release verification** from `main`.
2. Confirm `/api/health` reports the production database as reachable.
3. Confirm at least one sampled asset returns real Market Pairs.
4. Inspect desktop and a physical mobile device in an incognito session.
5. Inspect keyboard focus and perform a screen-reader spot check.
6. Confirm no credential or upstream API request appears in DevTools.
7. Confirm the Sentry test event arrives without request headers, body, query, cookies, or user context.
8. Capture final production screenshots for the submission and video.
