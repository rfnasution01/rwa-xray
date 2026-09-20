# Approved Product and Technical Decisions

Dokumen ini merangkum keputusan discovery yang telah disetujui. Keputusan ini bersifat normatif dan harus digunakan bersama PRD, Methodology, API, Architecture, dan `agent.md`.

## Product

| Area                     | Approved decision                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Primary persona          | Treasury/Risk Analyst                                                                |
| Core feature             | Exit Capacity Simulator                                                              |
| Initial asset focus      | Tokenized government securities                                                      |
| Primary simulator output | Estimated Exit Days, didukung Daily Exit Capacity dan Position-to-Volume Ratio       |
| Data mode                | Live CMC data + internal historical snapshots                                        |
| AI                       | Optional grounded Due-Diligence Memo                                                 |
| UI language              | English; internal documentation may remain Indonesian                                |
| Authentication           | No account required for hackathon                                                    |
| Default participation    | 5%; presets 1%, 5%, 10%, plus custom 0.1–20%                                         |
| Default position         | $100,000; presets $10K, $100K, $500K, $1M, plus custom                               |
| Stress haircut           | 0% default; presets 0%, 25%, 50%, 75%, plus custom up to 90%                         |
| Health display           | 0–100 breakdown plus separate Evidence Coverage confidence                           |
| Health placement         | Secondary to Exit Capacity; named Market Capacity Health                             |
| Exit horizon             | Neutral bands: <1 day, 1–3, 3–7, >7 days                                             |
| Compare                  | Up to four assets; suggested peers are editable; default sort by Estimated Exit Days |
| First experience         | Guided demo dashboard                                                                |
| Demo asset               | Curated government-security asset with automatic valid fallback                      |
| Currency                 | USD only for MVP                                                                     |
| Disclaimer               | Contextual near simulator/AI plus full methodology/limitations page                  |

## Historical data

| Area                  | Approved decision                                                              |
| --------------------- | ------------------------------------------------------------------------------ |
| Snapshot strategy     | Adaptive                                                                       |
| Priority snapshots    | Top 10 government securities plus actively viewed assets                       |
| Frequency             | Priority assets every 5 minutes; broader asset list every 15 minutes           |
| Replay                | Synced Estimated Exit Days, volume/turnover, and concentration timelines       |
| Default range         | 7 days; controls for 24H, 7D, All Available                                    |
| Retention             | Aggregate quotes long-term; raw market pairs 30 days then hourly aggregates    |
| Refresh               | Every 60 seconds while tab active; pause when hidden; manual refresh available |
| Upstream fallback     | Last real cached data, explicitly marked stale                                 |
| Maximum stale display | 24 hours; strong warning; AI disabled on stale data                            |

## Scoring and evidence

| Area                       | Approved decision                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Peer benchmark             | Category percentile when at least 10 valid assets; documented global fallback             |
| Health weights             | Activity 30%, diversification 30%, price consistency 15%, availability 15%, freshness 10% |
| Minimum composite coverage | 60%; otherwise no total score                                                             |
| Evidence Coverage labels   | 0–59 Limited, 60–79 Moderate, 80–100 High                                                 |
| Issuer concentration       | Known issuers plus coverage; no issuer score below 80% mapped volume                      |
| Pair freshness             | ≤15m valid; 15–60m warning/lower confidence; >60m excluded                                |
| Price outliers             | Preserve and flag using robust detection; show raw and robust metrics                     |
| Evidence Panel             | Structured summary plus expandable sanitized response excerpt                             |
| Missing data               | Never silently converted to zero                                                          |

## AI

| Area         | Approved decision                                                                    |
| ------------ | ------------------------------------------------------------------------------------ |
| Format       | Summary, Observed Strengths, Concentration Risks, Stress Scenario, Data Gaps         |
| Invocation   | On-demand via Generate Memo                                                          |
| Architecture | Provider-agnostic interface; Gemini initial adapter                                  |
| Cache        | Full input hash: asset, data snapshot, scenario, prompt and methodology versions     |
| Safety       | Structured output, metric references, no buy/sell recommendation, no AI calculations |

## UX and presentation

| Area          | Approved decision                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Visual style  | Dark-first Sleek and Futuristic dashboard with institutional character                                           |
| Themes        | Dark default plus light-mode compatibility; redesign dimulai dari landing                                        |
| Charts        | Deferred for release; Apache ECharts remains an option only with accessible table/text alternatives              |
| Components    | Semantic React components + Tailwind CSS; Radix/shadcn only when a new interaction requires the primitive        |
| Data fetching | TanStack Query                                                                                                   |
| SEO           | Index homepage, Explorer, asset detail, methodology; noindex reports and scenario variants                       |
| Sharing       | Lightweight shareable scenario URL in P1; immutable unlisted report deferred until core/P1 priorities are stable |

## Delivery priorities

P0 remains the complete core flow: guided dashboard, Explorer, Detail, Simulator, concentration, Health/Evidence Coverage, Compare, Evidence Panel, and resilient public deployment.

The two approved P1 differentiators are:

1. Historical Replay.
2. Grounded AI Due-Diligence Memo.

Immutable report storage and Market Cap Mirage are deferred. Scenario URLs may be implemented if low-risk.

## Platform and engineering

| Area        | Approved decision                                                                  |
| ----------- | ---------------------------------------------------------------------------------- |
| Application | Next.js App Router, TypeScript strict, pnpm                                        |
| Hosting     | Vercel                                                                             |
| Database    | Supabase PostgreSQL                                                                |
| ORM         | Drizzle ORM                                                                        |
| Scheduler   | GitHub Actions running a Node.js snapshot script directly                          |
| License     | MIT                                                                                |
| Monitoring  | Sentry plus redacted structured application logs                                   |
| Analytics   | PostHog cookieless anonymous events; no session recording or sensitive properties  |
| CI          | Lint, typecheck, unit tests, production build, secret scan                         |
| E2E         | Playwright on pull requests to main and before release                             |
| API outage  | Real stale cache only; never unlabeled mock production data                        |
| Cache TTL   | App policy differs from upstream frequency: metadata 24h, issuer 1h; stale max 24h |

## Evidence of completion

A decision is implemented only when behavior, tests, and relevant documentation agree. If a future decision changes this baseline, update this file in the same change and describe the migration impact.
