# Roadmap 21 Hari

## Sasaran

Menghasilkan demo publik yang stabil, berguna, dan dapat diverifikasi—bukan kumpulan fitur yang belum selesai.

## Prioritas

- **P0:** wajib untuk submission.
- **P1:** pembeda utama.
- **P2:** hanya dikerjakan setelah P0 stabil.

## Hari 1–3 — Discovery dan API spike

### Deliverables

- [x] Registrasi DoraHacks dan Startup tier aktif.
- [x] API key diuji melalui `pnpm verify:live`; seluruh tujuh endpoint tersedia.
- [x] Akses `market-pairs/list` tersedia melalui Startup plan dan response live terverifikasi.
- [x] Migration dan cache read/write/delete diverifikasi melalui Supabase Session Pooler.
- [x] Response tujuh endpoint RWA tersedia sebagai fixture tersanitasi.
- [x] Live CMC + Supabase verification harness tersedia tanpa secret logging.
- [ ] Field matrix dan data gap dicatat.
- [ ] Wireframe Explorer, Detail, Simulator, Compare.
- [ ] Metodologi v1 disetujui.

### Exit criteria

Minimal satu aset dapat diambil dari CMC dan ditampilkan tanpa membocorkan key.

## Hari 4–6 — Foundation

- [x] Setup Next.js + TypeScript strict + pnpm + lint/test.
- [x] Environment validation foundation.
- [x] CMC server client dengan validasi, timeout, bounded retry, redaction, dan typed error.
- [x] Normalization layer dengan stable domain model, evidence, dan warning.
- [x] PostgreSQL/Drizzle schema foundation.
- [x] PostgreSQL persistent cache, canonical cache keys, request deduplication, dan stale fallback 24 jam.
- [x] CI: typecheck, lint, test, build, secret scan.

### Exit criteria

Asset list dan detail tersedia melalui internal API dengan fixture tests.

## Hari 7–9 — Explorer dan detail

- [x] Explorer, current-page search, filter, sort, dan pagination.
- [x] Guided demo dengan live aggregate quote dan automatic valid fallback.
- [x] Full asset-detail page dengan simulator dan methodology warnings.
- [x] Token dan issuer breakdown dengan explicit unmapped state.
- [x] Market pairs table dengan unavailable state saat entitlement diblokir.
- [x] Loading, empty, stale, 429, dan upstream error UI untuk Guided Demo/Explorer.

### Exit criteria

Alur Explorer → Detail berjalan pada preview deployment.

## Hari 10–12 — Analysis engine

- [x] Turnover dan position-to-volume.
- [x] Exit capacity simulator.
- [x] Market/exchange/token/issuer concentration.
- [x] Raw dan robust price dispersion.
- [x] Freshness dan Evidence Coverage.
- [x] Market Capacity Health breakdown.
- [x] Unit test formula dan edge cases.

### Exit criteria

Semua formula P0 bersifat deterministic, versioned, dan lulus test.

## Hari 13–14 — Compare dan evidence

- [x] Compare 2–4 aset dengan partial-result handling.
- [x] Shared scenario input.
- [x] Evidence Panel pada Asset X-Ray.
- [x] Sanitized normalized excerpt melalui dedicated Evidence API.
- [x] Endpoint/field lineage per metric.

### Exit criteria

Pengguna dapat memverifikasi sumber metrik tanpa melihat secret.

### Backend status

- [x] Application service untuk Explorer dan asset detail.
- [x] `GET /api/assets` dengan validated filters dan pagination.
- [x] `GET /api/assets/:rwaId` dengan scenario parameters dan Analysis Engine.
- [x] Standard success/error envelope, request ID, safe partial-data status, dan basic rate limiting.
- [x] `POST /api/compare` dengan unique ID validation dan body limit.
- [x] `GET /api/assets/:rwaId/evidence` dengan sanitized lineage.

## Hari 15–16 — UX dan accessibility

- [ ] Mobile layout.
- [ ] Keyboard navigation.
- [ ] Chart fallback table.
- [ ] Number/date formatting.
- [ ] Disclaimer kontekstual.
- [x] First-use guided scenario.

### Exit criteria

Demo dapat digunakan dari mobile dan desktop tanpa penjelasan developer.

## Hari 17–18 — P1 differentiators

Dua prioritas yang telah dipilih:

- [x] Adaptive snapshot worker + GitHub Actions scheduler.
- [ ] Historical Replay API/UI dan hourly pair aggregation/retention.
- [ ] Grounded AI Due-Diligence Memo.

Shareable scenario URL boleh dikerjakan jika low-risk. Immutable report dan Market Cap Mirage ditunda. Jangan mengorbankan stabilitas P0.

## Hari 19 — Reliability dan security

- [x] End-to-end test critical path untuk Guided Demo, Explorer, dan Compare.
- [x] Rate-limit test.
- [x] Cache hit/stale fallback test.
- [x] Dependency audit (`pnpm audit --prod`: no known vulnerabilities).
- [x] Secret scan staged tree sebelum initial commit; CI memindai full history pada setiap push.
- [ ] API key rotation jika diperlukan.
- [x] Production monitoring: server/edge Sentry dan redacted structured logs.
- [x] Security headers, readiness check, deployment guide, dan production smoke harness.

## Hari 20 — Dokumentasi dan video

- [ ] README final.
- [ ] Architecture dan methodology sesuai implementasi aktual.
- [ ] Endpoint usage lengkap.
- [ ] Limitations jujur.
- [ ] Screenshot dan diagram.
- [ ] Rekam demo 2–3 menit.
- [ ] Caption/subtitle video.

## Hari 21 — Submission

- [ ] Freeze fitur.
- [x] Smoke test production.
- [x] Public repository dapat diakses.
- [x] Demo URL production tersedia dan lulus external smoke test.
- [ ] DoraHacks submission lengkap.
- [ ] X post dengan `#BuildwithCMC`.
- [ ] Link video, repository, demo, dan endpoint benar.
- [ ] Submit sebelum deadline, bukan menit terakhir.

## Backlog prioritas

### P0

- Explorer
- Asset detail
- Exit simulator
- Concentration
- Confidence
- Score breakdown
- Compare
- Evidence Panel
- Public deployment

### P1

- Historical Replay
- Grounded AI Due-Diligence Memo
- Shareable scenario URL jika low-risk

### P2

- Immutable unlisted report
- Market Cap Mirage
- Alert
- Multi-currency
- Export PDF
- User account
- Watchlist

## Definition of freeze

Mulai hari 19, fitur baru tidak masuk kecuali memperbaiki kriteria penilaian secara signifikan dan berisiko rendah. Bug, dokumentasi, reliability, dan presentasi lebih penting daripada satu chart tambahan.
