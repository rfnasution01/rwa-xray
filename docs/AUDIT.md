# Final UX, accessibility, and release audit

Audit date: 2026-09-20

## Scope and evidence

| Area                | Evidence                                                                                       | Result                              |
| ------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| Desktop             | Chromium desktop flows for landing, Explorer, Asset X-Ray, Compare, and Issuers                | Passed locally                      |
| Mobile              | 390 × 844 viewport, horizontal-overflow assertions, tooltip and tab interactions               | Passed locally                      |
| Keyboard only       | Landing → Explorer → search → Asset X-Ray → tab navigation without pointer input               | Passed locally                      |
| WCAG automated scan | Axe WCAG 2 A/AA and WCAG 2.1 A/AA on primary desktop/mobile views                              | Passed after remediations           |
| Focus               | Keyboard targets require a visible outline or focus shadow                                     | Passed locally                      |
| Failure states      | Empty, stale, 429, upstream/timeout-equivalent 503, and Compare partial failure                | Passed with deterministic API mocks |
| Browser safety      | Browser request URL/header/body and console scan for upstream hosts and credential identifiers | Passed locally                      |
| Live infrastructure | Seven CMC endpoints plus PostgreSQL write/read/delete through `pnpm verify:live`               | Passed                              |
| Production release  | Database readiness, seven-endpoint verification, Market Pairs gate, and smoke test             | Passed on production                |

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

## Production verification evidence

The production release confirmed:

- CI and the manual E2E workflow passed on `main`;
- `/api/health` reported the production database as reachable;
- all seven CMC endpoint checks and PostgreSQL write/read/delete passed;
- production smoke returned four Explorer assets and confirmed detail, Market Pairs, Evidence, and Compare;
- a manual priority snapshot persisted 13 of 13 discovered assets and snapshots without stale sources or issues;
- `SENTRY_DSN` was configured for production/preview and a sanitized SDK verification event flushed successfully.

## Remaining manual checks

1. Inspect desktop and a physical mobile device in an incognito session.
2. Inspect keyboard focus and perform a screen-reader spot check.
3. Confirm no credential or upstream API request appears in DevTools.
4. Inspect the flushed Sentry verification event in the dashboard and confirm redaction of request headers, body, query, cookies, and user context.
5. Capture final production screenshots for the submission and video.
