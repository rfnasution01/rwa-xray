# Coding Agent Guide — RWA X-Ray

Dokumen ini adalah instruksi operasional utama bagi coding agent yang mengembangkan **RWA X-Ray**. Baca seluruh dokumen ini dan dokumentasi terkait sebelum mengubah kode.

## 1. Project identity

- **Nama:** RWA X-Ray
- **Tagline:** Can I actually exit?
- **Event:** Build with CMC: API Hackathon 2026
- **Track:** Real World Assets
- **Jenis aplikasi:** Web application responsif
- **Tujuan utama:** membantu pengguna memahami aktivitas pasar, konsentrasi, kelengkapan data, dan kapasitas keluar berbasis volume untuk tokenized real-world assets.

RWA X-Ray bukan terminal trading, bukan sistem rekomendasi investasi, dan bukan alat prediksi harga.

## 2. Product thesis

Market cap tidak sama dengan likuiditas. Sebuah aset dapat memiliki tokenized market cap besar tetapi:

- volume rendah;
- aktivitas terkonsentrasi pada satu market, exchange, token, atau issuer;
- harga berbeda antar-market;
- data tidak lengkap atau stale;
- kapasitas pasar kecil dibanding ukuran posisi pengguna.

Aplikasi harus menjawab pertanyaan:

> “Untuk ukuran posisi saya, seperti apa kapasitas pasar yang teramati dan risiko konsentrasinya?”

Jangan mengubah pertanyaan tersebut menjadi klaim:

> “Berapa lama saya pasti dapat menjual tanpa slippage?”

## 3. Sources of truth

Baca dokumen dalam urutan berikut:

1. `agent.md` — aturan kerja coding agent.
2. `docs/PRD.md` — scope produk dan acceptance criteria.
3. `docs/DECISIONS.md` — baseline keputusan discovery yang telah disetujui.
4. `docs/METHODOLOGY.md` — formula dan batas interpretasi.
5. `docs/API.md` — integrasi CoinMarketCap API.
6. `docs/ARCHITECTURE.md` — desain sistem.
7. `docs/ROADMAP.md` — prioritas delivery.
8. `docs/SUBMISSION.md` — kebutuhan submission.
9. `README.md` — ringkasan publik proyek.

Jika terjadi konflik:

- keamanan dan perlindungan secret selalu menang;
- formula pada `docs/METHODOLOGY.md` menang atas implementasi lama;
- acceptance criteria pada `docs/PRD.md` menang atas ide tambahan;
- dokumentasi resmi CMC terbaru menang atas contoh response lokal;
- jangan mengubah perilaku produk hanya untuk membuat test lama lulus jika test tersebut bertentangan dengan metodologi.

Jika keputusan baru mengubah scope, arsitektur, kontrak API internal, atau formula, perbarui dokumentasi terkait pada perubahan yang sama.

## 4. Current repository state

Repository telah memasuki tahap **P0 deployment readiness**. Next.js, TypeScript strict, Tailwind, Vitest, Playwright, Drizzle, environment validation, CI, typed CMC client, normalization layer, PostgreSQL persistent cache, cached RWA repository, Analysis Engine v1.0.0, application service, Explorer/detail API routes, serta live verification harness telah tersedia. Supabase dan enam endpoint CMC telah terverifikasi; `market-pairs/list` diblokir subscription plan (`403/1006`). Adaptive snapshot worker, GitHub Actions scheduler, guided live scenario, responsive Explorer, full Asset X-Ray detail page, Compare Mode, dedicated Evidence API, security headers, readiness check, dan production smoke harness telah tersedia. Public repository dan Vercel deployment aktif di `https://rwa-xray.vercel.app`; CI, external production smoke, dan manual priority snapshot workflow telah lulus. Historical Replay, monitoring integration, dan reliability polish masih harus dibangun.

Periksa `package.json` sebelum menjalankan command. Pertahankan scripts standar berikut:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:e2e
pnpm format:check
```

Jika memilih command atau tool yang berbeda, dokumentasikan alasannya dan perbarui bagian ini serta README.

## 5. Recommended stack

Gunakan stack sederhana agar dapat selesai dalam 21 hari:

- **Framework:** Next.js App Router
- **Language:** TypeScript dengan strict mode
- **UI:** React + Tailwind CSS + shadcn/ui/Radix UI
- **Client data:** TanStack Query
- **Validation:** Zod
- **Database:** Supabase PostgreSQL
- **ORM/query layer:** Drizzle ORM
- **Unit/integration test:** Vitest
- **UI test:** Testing Library
- **End-to-end test:** Playwright
- **Charts:** Apache ECharts dengan accessible table/text fallback
- **Hosting:** Vercel
- **Scheduler:** GitHub Actions menjalankan Node.js script
- **Package manager:** pnpm
- **Formatting/linting:** Prettier + ESLint

Hindari microservices, event bus, GraphQL, atau backend kedua kecuali ada kebutuhan yang terukur. Monolith Next.js adalah default MVP.

## 6. Target repository structure

```text
.
├── agent.md
├── README.md
├── docs/
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── compare/
│   │   ├── methodology/
│   │   └── page.tsx
│   ├── components/
│   │   ├── charts/
│   │   ├── evidence/
│   │   ├── simulator/
│   │   └── ui/
│   ├── server/
│   │   ├── cmc/
│   │   ├── db/
│   │   ├── repositories/
│   │   └── services/
│   ├── domain/
│   │   ├── analysis/
│   │   ├── assets/
│   │   └── shared/
│   ├── lib/
│   └── styles/
├── tests/
│   ├── fixtures/
│   ├── integration/
│   └── e2e/
├── drizzle/
├── .env.example
└── package.json
```

Aturan dependency:

- `app` boleh bergantung pada `components`, `domain`, dan public service interfaces.
- `components` tidak boleh memanggil CMC secara langsung.
- `domain` tidak boleh bergantung pada Next.js, database, HTTP client, atau React.
- `server/cmc` menangani upstream API dan tidak berisi formula UI.
- scoring engine harus berupa pure functions dalam `domain/analysis`.

## 7. Core product scope

### P0 — harus selesai

1. RWA Explorer.
2. Asset detail.
3. Exit Capacity Simulator.
4. Market/exchange/token/issuer concentration sesuai data tersedia.
5. Data freshness dan Confidence Score.
6. Health Score dengan breakdown.
7. Compare 2–4 aset.
8. Evidence Panel.
9. Public deployment.
10. Error, loading, empty, stale, dan rate-limit states.

### P1 — dua prioritas setelah P0 stabil

- Historical Replay dari adaptive internal snapshots.
- Grounded AI Due-Diligence Memo.
- Shareable scenario URL hanya jika low-risk.

Immutable report dan Market Cap Mirage ditunda ke P2.

### P2 — jangan dikerjakan sebelum P0 dan P1 pilihan selesai

- Alerts.
- Multi-currency penuh.
- PDF export.
- User accounts.
- Watchlist.

Jangan menambah fitur trading, wallet, custody, KYC, price prediction, atau buy/sell recommendation.

## 8. CoinMarketCap API rules

Base URL production:

```text
https://pro-api.coinmarketcap.com
```

Authentication header:

```http
X-CMC_PRO_API_KEY: ${CMC_API_KEY}
```

Endpoint RWA yang telah diverifikasi:

```text
GET /v5/real-world-assets/map
GET /v5/real-world-assets/info
GET /v5/real-world-assets/assets/list
GET /v5/real-world-assets/market-pairs/list
GET /v5/real-world-assets/quotes/latest
GET /v5/real-world-assets/issuers/list
GET /v5/real-world-assets/issuers
```

### Mandatory API rules

- API key hanya boleh digunakan pada server runtime.
- Browser tidak boleh menerima key atau meneruskan request langsung ke CMC.
- Gunakan `rwa_id` sebagai canonical identifier.
- Simbol dan slug hanya digunakan untuk lookup atau display.
- Gunakan USD sebagai conversion currency MVP.
- Validasi identifier, sort, pagination, dan currency melalui allowlist.
- Jangan membuat generic open proxy ke base URL CMC.
- Set timeout pada semua upstream request.
- Retry hanya error sementara dan maksimal secara terbatas.
- Untuk `429`, lakukan backoff dan gunakan stale cache bila tersedia.
- Catat `status.credit_count` jika tersedia, tetapi jangan log secret.
- Bedakan upstream `last_updated` dari waktu aplikasi mengambil data.
- Endpoint dan parameter harus diverifikasi kembali terhadap dokumentasi resmi sebelum release.

### Caching defaults

| Data          | TTL awal |
| ------------- | -------: |
| RWA map       | 30 detik |
| Asset list    | 60 detik |
| Latest quotes | 60 detik |
| Market pairs  | 60 detik |
| Metadata      |   24 jam |
| Issuer data   |    1 jam |

Cache key harus mencakup path dan parameter yang sudah dinormalisasi. Deduplicate request identik yang sedang berjalan.

### Historical data

Jangan mengklaim endpoint historical RWA jika belum diverifikasi. Historical replay MVP menggunakan snapshot internal dan harus menunjukkan awal periode pengumpulan.

## 9. Environment variables

Gunakan validasi environment server-side saat startup.

```dotenv
CMC_API_KEY=
CMC_API_BASE_URL=https://pro-api.coinmarketcap.com
DATABASE_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Variable yang diawali `NEXT_PUBLIC_` tidak boleh mengandung key, credential, internal host, atau data sensitif.

`.env.example` hanya berisi nama variable dan placeholder. Pastikan `.env`, `.env.local`, dan varian secret lain masuk `.gitignore`.

## 10. Domain model and normalization

### Canonical asset

```ts
interface RwaAsset {
  rwaId: number;
  name: string;
  symbol: string;
  slug: string;
  assetType:
    | "stock"
    | "commodity"
    | "currency"
    | "government_security"
    | "etf"
    | "real_estate";
  rank: number | null;
}
```

### Monetary values

- Database menggunakan decimal/numeric, bukan binary float.
- API boundary dapat memakai string decimal atau number yang telah divalidasi.
- Semua value harus membawa currency jika maknanya tidak eksplisit.
- `null` berarti unavailable/unknown.
- `0` berarti nilai nol yang benar-benar dilaporkan.
- Jangan mengubah missing field menjadi nol.

### Timestamp

Simpan:

- `sourceUpdatedAt`: waktu menurut upstream;
- `observedAt`: waktu aplikasi menerima/menyimpan data;
- `calculatedAt`: waktu metrik dihitung.

Gunakan UTC dan ISO-8601 pada boundary.

### Upstream DTO vs domain model

Pisahkan tipe response CMC dari domain model. Semua response upstream harus:

1. diparse;
2. divalidasi;
3. dinormalisasi;
4. baru diteruskan ke service/domain.

Jangan menyebarkan bentuk response CMC langsung ke komponen UI.

## 11. Analysis methodology

Implementasi formula harus mengikuti `docs/METHODOLOGY.md`. Jangan menyalin threshold ke banyak file. Semua threshold berada pada satu konfigurasi berversi.

### Turnover

```text
turnover_ratio = volume_24h / market_cap
```

Jika market cap tidak positif, hasil `null` dengan reason code.

### Effective volume

```text
effective_volume = volume_24h × (1 - stress_haircut)
```

### Daily capacity

```text
daily_capacity = effective_volume × participation_rate
```

### Estimated exit days

```text
estimated_exit_days = position_value / daily_capacity
```

Defaults:

- posisi: $100.000; preset $10K, $100K, $500K, $1M, plus custom;
- konservatif: 1%;
- moderat/default: 5%;
- agresif: 10%;
- custom input: 0,1–20%;
- haircut default 0%; preset 0%, 25%, 50%, 75%; custom hingga 90%.

UI harus selalu menyebut hasil sebagai scenario/capacity estimate. Jangan menyebutnya prediksi pasti atau safe exit.

### Concentration

```text
share_i = volume_i / total_volume
HHI = sum(share_i²)
normalized_HHI = (HHI - 1/n) / (1 - 1/n), untuk n > 1
```

Hitung market, exchange, token, dan issuer concentration secara terpisah. Jangan menggabungkannya tanpa label.

### Missing data

- Metrik unavailable menghasilkan `null` dan reason code.
- Score dihitung ulang berdasarkan bobot komponen yang tersedia.
- Market Capacity Health menggunakan bobot Activity 30%, diversification 30%, price consistency 15%, availability 15%, freshness 10%.
- Score tidak ditampilkan jika bobot data tersedia kurang dari 60%.
- Missing data menurunkan confidence, bukan otomatis menurunkan health ke nol.

### Versioning

Setiap hasil analisis harus menyertakan:

```ts
interface AnalysisMetadata {
  methodologyVersion: string;
  calculatedAt: string;
  inputSnapshotIds: string[];
  configurationHash: string;
}
```

## 12. Output language and terminology

### Product UI

Gunakan bahasa Inggris untuk UI submission utama agar mudah dinilai secara global. Gunakan modern fintech dashboard dengan karakter institutional, light theme sebagai default, dan dark mode. Halaman pertama adalah guided demo dengan curated government-security asset dan fallback valid. Arsitektur harus memungkinkan localization, tetapi jangan membangun sistem i18n kompleks sebelum P0 selesai.

### Code

Gunakan bahasa Inggris untuk:

- variable dan function names;
- type names;
- comments;
- error codes;
- commit messages;
- API fields.

Dokumentasi internal saat ini boleh berbahasa Indonesia.

### Required terminology

Gunakan:

- market capacity;
- volume participation scenario;
- observed activity;
- evidence coverage;
- limited/moderate/high confidence;
- data unavailable;
- concentration risk.

Hindari:

- guaranteed liquidity;
- safe asset;
- guaranteed exit time;
- scam detector;
- risk-free;
- financial advice;
- pasti untung/rugi;
- buy/sell recommendation.

## 13. UI and accessibility rules

- Mobile-first, tetapi dashboard desktop harus optimal.
- Score tidak boleh disampaikan dengan warna saja.
- Semua chart memiliki table atau text summary.
- Gunakan semantic HTML.
- Seluruh kontrol dapat digunakan dengan keyboard.
- Focus state harus terlihat.
- Target kontras WCAG AA.
- Loading state menggunakan skeleton yang tidak mengubah layout ekstrem.
- Error message menjelaskan apakah data stale masih ditampilkan.
- Tampilkan timestamp dan currency dekat data penting.
- Number formatting konsisten dan tidak menyembunyikan nilai sangat kecil.
- Jangan menampilkan precision yang lebih tinggi dari kualitas data.

## 14. Evidence Panel rules

Evidence Panel merupakan fitur produk, bukan debug dump.

Boleh ditampilkan:

- HTTP method;
- endpoint path;
- parameter non-rahasia;
- status code;
- source update time;
- fetched time;
- cache hit/miss/stale;
- credit count;
- response excerpt yang telah disanitasi;
- daftar fitur/metrik yang memakai data tersebut.

Tidak boleh ditampilkan:

- API key;
- authorization headers;
- cookie/session;
- internal database URL;
- stack trace production;
- user identifier;
- raw environment values.

Buat fungsi redaction terpusat dan test terhadap key dengan variasi casing.

## 15. AI feature rules

AI bersifat opsional dan tidak boleh berada di critical path.

Jika Grounded AI Memo diimplementasikan:

- input hanya structured analysis result;
- gunakan JSON schema untuk output;
- model tidak melakukan kalkulasi utama;
- angka pada output harus dapat dipetakan kembali ke metric key;
- validasi bahwa angka terdapat dalam input;
- tampilkan bahwa ringkasan dihasilkan AI;
- jika provider gagal, detail aset tetap bekerja;
- jangan mengirim API key atau raw private logs ke provider;
- jangan memberikan rekomendasi beli/jual.

Jangan membangun chatbot generik.

## 16. Database rules

Tabel minimum mengikuti `docs/ARCHITECTURE.md`:

- `rwa_assets`;
- `rwa_quotes`;
- `rwa_tokens`;
- `rwa_market_pairs`;
- `issuers`;
- `analysis_snapshots`.

Aturan:

- migration harus version-controlled;
- jangan edit migration yang telah dipakai production; buat migration baru;
- gunakan unique constraint untuk canonical upstream IDs;
- upsert harus idempotent;
- snapshot bersifat append-only kecuali ada kebijakan retention eksplisit;
- jangan menyimpan secret atau authorization header;
- raw payload opsional, tersanitasi, dan memiliki retention terbatas.

## 17. Internal API conventions

Target routes:

```text
GET  /api/assets
GET  /api/assets/:rwaId
POST /api/compare
GET  /api/assets/:rwaId/evidence
POST /api/reports          # P1
GET  /api/reports/:id      # P1
GET  /api/health
```

Gunakan response envelope konsisten:

```ts
type ApiSuccess<T> = {
  data: T;
  meta?: {
    requestId: string;
    generatedAt: string;
    stale?: boolean;
  };
};

type ApiFailure = {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
  meta: {
    requestId: string;
  };
};
```

Jangan mengirim stack trace pada production response. Gunakan error code stabil untuk UI.

## 18. Error handling and resilience

### Upstream status

- `400`: programming/input error; jangan retry.
- `401/403`: configuration error; alert server-side, jangan buka secret.
- `429`: exponential backoff dengan jitter; gunakan stale cache bila ada.
- `5xx`: retry terbatas; fallback ke stale cache.
- timeout/network: retry terbatas bila request idempotent.

### Partial data

Produk harus dapat menampilkan hasil parsial:

- kalkulasi hanya metrik yang input-nya valid;
- tampilkan data gaps;
- turunkan confidence;
- jangan menggagalkan seluruh halaman hanya karena issuer atau pair data tidak tersedia.

### Retry restrictions

- jangan retry tanpa batas;
- jangan retry `400`, `401`, atau `403` secara otomatis;
- jangan membuat request storm dari React rerender;
- gunakan abort signal jika request pengguna dibatalkan.

## 19. Security non-negotiables

- Jangan commit API key atau credential.
- Jangan menulis secret dalam test fixture.
- Jangan expose key melalui `NEXT_PUBLIC_*`.
- Jangan log request headers mentah.
- Jangan menerima arbitrary upstream URL dari client.
- Validasi seluruh input server dengan Zod.
- Gunakan parameterized query/ORM.
- Terapkan rate limiting pada endpoint yang memicu upstream request.
- Shared report harus memakai unguessable ID dan tidak menyimpan data pribadi.
- Jalankan secret scan sebelum commit/release.
- Jika secret pernah ter-commit, hapus dari history sesuai kebutuhan dan rotasi key; menghapus file saja tidak cukup.

## 20. Testing strategy

### Unit tests — wajib

Prioritaskan pure analysis functions:

- turnover dengan normal, zero, null, negative;
- exit capacity boundaries;
- haircut 0% dan 90%;
- HHI equal distribution dan full concentration;
- normalized HHI untuk `n=1`;
- price dispersion;
- missing component weighting;
- confidence factors;
- stale/fresh threshold;
- all outputs finite atau null + reason.

### CMC client tests — wajib

- parse successful fixture;
- malformed response;
- partial fields;
- timeout;
- 429;
- 5xx retry cap;
- redaction;
- cache key normalization;
- request deduplication.

Gunakan fixture tersanitasi. Unit/integration tests tidak boleh bergantung pada live CMC API.

### Component tests

- simulator updates result;
- missing value renders “Unavailable”, bukan `$0`;
- warning dan disclaimer terlihat;
- score breakdown accessible;
- Evidence Panel tidak memuat secret-like header.

### End-to-end tests

Critical path:

1. buka Explorer;
2. cari/filter aset;
3. buka detail;
4. jalankan simulator;
5. buka concentration dan evidence;
6. compare dua aset;
7. verifikasi stale/error fallback.

### Live API smoke test

Boleh dibuat sebagai script manual/CI opt-in yang hanya berjalan ketika secret tersedia. Jangan jadikan live API sebagai syarat unit test biasa.

## 21. Code quality conventions

- TypeScript strict; jangan memakai `any` tanpa alasan dan komentar.
- Prefer named exports untuk domain/service modules.
- Function kecil dengan satu tanggung jawab.
- Hindari boolean parameter ambigu; gunakan options object.
- Jangan membuat abstraction sebelum ada minimal dua use case nyata.
- Gunakan exhaustive switch untuk union penting.
- Semua public domain function mempunyai type eksplisit.
- Komentar menjelaskan “why”, bukan mengulang kode.
- Hindari magic number; gunakan methodology config berversi.
- Jangan menambahkan dependency untuk fungsi kecil yang mudah dibuat aman.
- Hapus dead code dan debug logging sebelum merge.

## 22. Performance rules

- Browser refresh setiap 60 detik saat tab aktif dan berhenti saat hidden.
- Real cached data dapat ditampilkan maksimal 24 jam dengan stale warning; AI harus nonaktif.
- Batch asset list; jangan satu call per card.
- Detail request hanya memuat data yang diperlukan.
- Lazy-load chart berat bila perlu.
- Hindari repeated calculation saat input tidak berubah.
- Pagination dilakukan server-side untuk upstream list.
- Gunakan database index untuk `rwa_id`, `observed_at`, dan foreign keys.
- Jangan prefetch market pairs seluruh universe.
- Ukur sebelum melakukan optimisasi kompleks.

## 23. Observability

Log terstruktur minimal:

- request ID;
- internal route;
- upstream endpoint name, bukan full sensitive URL;
- latency;
- status category;
- cache status;
- stale fallback;
- credit count;
- methodology version untuk analysis errors.

Metrics penting:

- upstream success/error rate;
- 429 count;
- cache hit ratio;
- stale response count;
- p50/p95 latency;
- data age;
- analysis failure count.

Jangan log key, full headers, database credential, atau payload pengguna yang tidak diperlukan.

## 24. Agent workflow

Untuk setiap task:

1. Baca file terkait dan periksa repository state.
2. Identifikasi acceptance criteria dan risiko keamanan/data.
3. Buat perubahan terkecil yang menyelesaikan task.
4. Tambah atau perbarui test.
5. Jalankan test paling relevan terlebih dahulu.
6. Jalankan lint, typecheck, dan build jika tersedia.
7. Periksa diff untuk secret, debug code, dan scope creep.
8. Perbarui dokumentasi jika kontrak/perilaku berubah.
9. Laporkan file yang berubah, test yang dijalankan, dan limitation yang tersisa.

Jangan:

- menulis implementasi berdasarkan asumsi tanpa membaca file;
- melakukan rewrite besar jika edit terarah cukup;
- menghapus test karena gagal tanpa memahami alasannya;
- mengubah formula diam-diam;
- menambahkan P1/P2 saat P0 terkait belum stabil;
- mengklaim command sukses jika tidak dijalankan;
- memasukkan mock data ke production tanpa label.

## 25. Bootstrap sequence

Foundation bootstrap telah dibuat. Jika fondasi perlu dibangun ulang atau dilengkapi, gunakan urutan ini:

1. Inisialisasi Next.js TypeScript dengan App Router.
2. Konfigurasi pnpm, strict TypeScript, ESLint, Prettier.
3. Tambahkan `.gitignore` dan `.env.example`.
4. Tambahkan Vitest dan satu test sanity.
5. Buat environment validation.
6. Buat typed CMC client dan fixture tests.
7. Buat domain analysis package dan unit tests.
8. Buat schema/migration PostgreSQL.
9. Implementasikan internal API.
10. Baru bangun UI Explorer dan Detail.

Setelah setiap tahap, pastikan `pnpm test`, `pnpm typecheck`, dan `pnpm lint` tetap lulus.

## 26. Feature implementation order

Gunakan urutan berikut agar demo end-to-end tersedia secepat mungkin:

1. CMC map/list integration dengan fokus government securities.
2. Guided demo dan Explorer minimal.
3. Quotes + market pairs detail.
4. Normalization and caching.
5. Exit simulator dengan default $100.000, 5%, 0% haircut.
6. Concentration and confidence.
7. Health Score.
8. Compare.
9. Evidence Panel.
10. UX/accessibility/reliability.
11. Maksimal dua P1 differentiators.

## 27. Definition of done for a feature

Sebuah fitur dianggap selesai jika:

- acceptance criteria PRD terpenuhi;
- happy path dan failure state tersedia;
- input tervalidasi;
- test relevan ditambahkan dan lulus;
- tidak membocorkan secret;
- accessible dengan keyboard;
- number, currency, dan timestamp ditampilkan benar;
- missing data tidak disamarkan sebagai nol;
- metodologi/endpoint dapat ditelusuri;
- dokumentasi diperbarui jika perlu;
- production build tetap berhasil.

## 28. Definition of done for hackathon release

- Explorer → Detail → Simulator → Compare berjalan di URL publik.
- Minimal tiga jenis RWA dapat dianalisis.
- Evidence Panel menunjukkan panggilan nyata yang disanitasi.
- Formula utama mempunyai unit test.
- Error/stale/rate-limit state telah diuji.
- API key tidak ada pada source, bundle, response, log, fixture, atau git history.
- README memuat live URL, screenshot, setup, dan limitations.
- Daftar endpoint aktual pada submission sama dengan implementasi.
- Video 2–3 menit menunjukkan problem, workflow, dan API evidence.
- Repository publik dan CI hijau.

## 29. Commit and pull request guidance

Commit message gunakan bentuk singkat dan imperatif, misalnya:

```text
feat: add RWA asset explorer
fix: preserve null volume in quote normalization
test: cover concentrated market HHI
docs: update CMC endpoint usage
```

PR/deskripsi perubahan harus memuat:

- apa yang berubah;
- alasan;
- cara menguji;
- screenshot untuk UI;
- dampak API credit/cache;
- perubahan methodology atau schema;
- risiko/limitation tersisa.

Jangan mencampur refactor besar, dependency upgrade, dan fitur baru tanpa alasan.

## 30. Known limitations to preserve honestly

- Volume 24 jam bukan order-book depth.
- Exit Capacity tidak menghitung slippage.
- Cakupan market dapat berbeda antar-aset.
- Aggregate volume dan sum pair volume dapat memiliki cakupan berbeda.
- Confidence mengukur evidence coverage, bukan keamanan aset.
- Health Score bukan rekomendasi investasi.
- Historical replay hanya mencakup snapshot yang dikumpulkan aplikasi.
- Issuer metadata tidak sama dengan verifikasi reserve/legal claim.

Jika limitation baru ditemukan, dokumentasikan; jangan menyembunyikannya melalui fallback yang menyesatkan.

## 31. Final agent checklist

Sebelum menyatakan pekerjaan selesai:

- [ ] Saya membaca file terkait.
- [ ] Saya tidak mengubah scope tanpa alasan.
- [ ] Saya menggunakan `rwa_id` sebagai canonical ID.
- [ ] Saya membedakan null dan zero.
- [ ] Saya menjaga currency dan timestamp.
- [ ] Saya tidak mengekspos API key.
- [ ] Saya mengikuti methodology version.
- [ ] Saya menambahkan/memperbarui test.
- [ ] Saya menjalankan command validasi yang tersedia.
- [ ] Saya memeriksa error dan partial-data state.
- [ ] Saya memperbarui dokumentasi jika kontrak berubah.
- [ ] Saya melaporkan limitation secara jujur.

---

Fokus utama seluruh keputusan teknis adalah menghasilkan produk yang **berfungsi, berguna, dapat diverifikasi, aman, dan jujur terhadap keterbatasan data** dalam waktu hackathon.
