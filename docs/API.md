# Integrasi CoinMarketCap API

## 1. Konfigurasi

Base URL production:

```text
https://pro-api.coinmarketcap.com
```

Header server-side:

```http
X-CMC_PRO_API_KEY: ${CMC_API_KEY}
Accept: application/json
```

Contoh environment:

```dotenv
CMC_API_KEY=replace_with_your_key
CMC_API_BASE_URL=https://pro-api.coinmarketcap.com
```

Jangan menaruh key asli pada `.env.example`, frontend bundle, screenshot, log, atau repository.

## 2. Endpoint RWA terverifikasi

Referensi diperiksa dari dokumentasi CoinMarketCap RWA Pro API pada saat dokumen ini dibuat.

### 2.1 RWA ID Map

```http
GET /v5/real-world-assets/map
```

**Tujuan:** mendapatkan `rwa_id` stabil sebelum memanggil endpoint yang lebih berat. Tidak membawa market data.

**Parameter berguna:** `asset_type`, `symbol`, `sort`, `start`, `limit` sesuai dokumentasi.

**Update:** 30 detik.  
**Credit:** dokumentasi menyatakan tidak menggunakan call credit.

### 2.2 Metadata

```http
GET /v5/real-world-assets/info
```

**Tujuan:** metadata statis, nominal/company fields, deskripsi, logo, dan website.

Gunakan cache panjang karena data tidak berubah sesering quote.

### 2.3 RWA Asset List

```http
GET /v5/real-world-assets/assets/list
```

**Tujuan:** explorer paginated dengan aggregate quote:

- `average_tokenized_price`;
- `tokenized_market_cap`;
- `tokenized_volume_24h`;
- rank dan tipe aset.

**Filter:** `rwa_id`, `rwa_slug`, `symbol`, atau `asset_type`. Hanya satu jenis identifier per request.  
**Sort:** `rwa_rank`, `tokenized_market_cap`, `tokenized_volume_24h`, `average_tokenized_price`, `symbol`.  
**Pagination:** `start`, `limit` dengan limit maksimum 250.  
**Update:** 1 menit.  
**Credit:** 1 credit per 250 aset, ditambah conversion tambahan sesuai dokumentasi.

### 2.4 Market Pairs

```http
GET /v5/real-world-assets/market-pairs/list
```

**Tujuan:** market aktif untuk underlying token dari satu RWA.

Memerlukan tepat satu dari:

- `rwa_id`;
- `rwa_slug`;
- `symbol`.

Menyediakan exchange, pair, price, volume 24 jam, dan waktu pembaruan. Digunakan untuk market concentration dan price dispersion.

**Sort:** `volume_24h` atau `price`.  
**Pagination:** maksimum 250 per request. Detail dan Compare mengambil seluruh page secara berurutan sebelum menghitung concentration atau price dispersion. Jika page lanjutan gagal, kosong ketika `has_more=true`, berubah total, atau tidak lengkap, dataset market-pair diperlakukan unavailable agar metrik tidak dihitung dari subset yang menyesatkan.

**Update:** 1 menit.  
**Credit:** 1 per 250 market pairs, ditambah conversion tambahan.

### 2.5 Quotes Latest

```http
GET /v5/real-world-assets/quotes/latest
```

**Tujuan:** detail terbaru untuk satu atau lebih RWA, termasuk:

- aggregate tokenized quote;
- underlying token dan harga individual;
- issuer token;
- market cap dan volume token;
- TradFi markets yang tersedia dalam response.

Memerlukan salah satu identifier: `rwa_id`, `rwa_slug`, atau `symbol`.

**Update:** 60 detik.  
**Credit:** 1 per 250 aset, ditambah conversion tambahan.

### 2.6 Issuers List

```http
GET /v5/real-world-assets/issuers/list
```

**Tujuan:** daftar issuer untuk discovery dan pemetaan token ke issuer.

### 2.7 Issuer Detail

```http
GET /v5/real-world-assets/issuers
```

**Tujuan:** detail issuer berdasarkan identifier yang disyaratkan dokumentasi.

## 3. Contoh request aman

```bash
curl --get 'https://pro-api.coinmarketcap.com/v5/real-world-assets/assets/list' \
  --header "X-CMC_PRO_API_KEY: $CMC_API_KEY" \
  --data-urlencode 'asset_type=commodity' \
  --data-urlencode 'sort=tokenized_volume_24h' \
  --data-urlencode 'sort_dir=desc' \
  --data-urlencode 'limit=20' \
  --data-urlencode 'convert=USD'
```

```bash
curl --get 'https://pro-api.coinmarketcap.com/v5/real-world-assets/market-pairs/list' \
  --header "X-CMC_PRO_API_KEY: $CMC_API_KEY" \
  --data-urlencode 'rwa_id=1' \
  --data-urlencode 'sort=volume_24h' \
  --data-urlencode 'sort_dir=desc' \
  --data-urlencode 'limit=100' \
  --data-urlencode 'convert=USD'
```

## 4. Endpoint-to-feature mapping

| Feature                | Endpoint utama        | Data turunan                      |
| ---------------------- | --------------------- | --------------------------------- |
| Explorer               | assets/list           | turnover ratio, basic flags       |
| Asset metadata         | info                  | description, logo, website        |
| Token/issuer breakdown | quotes/latest         | token share, issuer concentration |
| Market concentration   | market-pairs/list     | top share, top-3 share, HHI       |
| Price dispersion       | market-pairs/list     | weighted deviation                |
| Issuer explorer        | issuers/list, issuers | issuer metadata                   |
| Stable identifier      | map                   | symbol/slug → `rwa_id`            |
| Historical replay      | snapshot internal     | perubahan metrik sejak observasi  |

## 5. Strategi credit dan caching

1. Gunakan `/map` untuk lookup ringan.
2. Ambil `/assets/list` dalam batch, bukan satu request per card.
3. Panggil `/quotes/latest` dan `/market-pairs/list` saat detail dibuka atau snapshot prioritas berjalan.
4. Deduplicate request identik yang terjadi bersamaan.
5. Cache sesuai update frequency upstream.
6. Gunakan satu conversion (`USD`) pada MVP.
7. Jangan prefetch seluruh pair untuk semua aset.
8. Catat `status.credit_count` untuk observability.

## 6. Normalized response internal

UI tidak menggunakan response upstream secara langsung. Backend mengubahnya menjadi kontrak stabil:

```json
{
  "asset": {
    "rwaId": 2,
    "name": "Example Asset",
    "symbol": "EXAMPLE",
    "assetType": "stock"
  },
  "quote": {
    "currency": "USD",
    "averagePrice": 100.0,
    "marketCap": 10000000.0,
    "volume24h": 500000.0,
    "sourceUpdatedAt": "2026-09-09T06:50:33Z"
  },
  "tokens": [],
  "marketPairs": [],
  "evidence": {
    "endpoints": [],
    "fetchedAt": "2026-09-09T06:51:00Z",
    "cache": "hit"
  }
}
```

## 7. Evidence Panel

Boleh ditampilkan:

- method dan path;
- parameter non-rahasia;
- HTTP status;
- waktu fetch dan source update;
- credit count;
- sanitized response excerpt.

Harus disembunyikan:

- API key;
- semua request header sensitif;
- internal infrastructure detail;
- user identifier.

## 8. Data freshness

Simpan dua timestamp:

- `source_updated_at`: waktu data menurut CMC;
- `observed_at`: waktu aplikasi menerima atau menyimpan data.

Jangan mengganti source time dengan server time. Jika `source_updated_at` kosong, confidence freshness diturunkan.

## 9. Historical data

Daftar tujuh endpoint RWA yang diverifikasi tidak mencantumkan endpoint historical terpisah. Oleh sebab itu:

- MVP tidak mengklaim memiliki histori sebelum observasi;
- snapshot dibuat oleh worker aplikasi;
- chart menyatakan awal periode pengumpulan;
- jika endpoint resmi baru tersedia kemudian, integrasi harus diverifikasi sebelum digunakan.

## 10. Penanganan error

- `400`: perbaiki parameter; jangan retry otomatis.
- `401/403`: configuration alert; jangan tampilkan detail secret.
- `429`: patuhi backoff dan gunakan stale cache jika ada.
- `5xx`: retry terbatas dengan jitter.
- response parsial: simpan field valid dan tandai missing data.

## 11. Status implementasi client

Typed server-side client tersedia di `src/server/cmc/` dengan:

- method untuk seluruh tujuh endpoint RWA;
- query allowlist dan aturan identifier eksklusif;
- USD sebagai conversion MVP;
- validasi response menggunakan Zod;
- timeout 8 detik dan maksimal tiga attempt untuk timeout, network error, `429`, dan `5xx`;
- dukungan `Retry-After`, exponential backoff, dan jitter;
- in-flight request deduplication;
- error code stabil dan recursive secret redaction;
- sanitized fixtures serta unit test tanpa live API;
- normalization adapter untuk seluruh response menjadi stable camelCase domain models;
- preservasi explicit `null`, angka `0`, dan boolean `false`;
- UTC timestamp normalization, source evidence, dan typed warning.

Persistent cache dan stale fallback tersedia terpisah di `src/server/cache/`, sedangkan orchestration tujuh endpoint tersedia di `src/server/repositories/rwa-repository.ts`. Cache key hanya memuat endpoint dan canonical non-secret query. Setiap payload divalidasi ulang sebelum digunakan; stale data tidak pernah disajikan setelah 24 jam sejak observasi.

## 12. Internal API contracts

### Explorer

```http
GET /api/assets?assetType=government_security&sort=rwa_rank&sortDir=asc&start=1&limit=100
```

### Asset detail and analysis

```http
GET /api/assets/101?positionValue=100000&participationRate=0.05&stressHaircut=0
```

### Issuer directory

```http
GET /api/issuers?active=true&start=1&limit=24
```

Issuer directory mengembalikan normalized issuer summaries, token count, pagination, cache status, dan stale state tanpa meneruskan payload atau credential upstream.

### Issuer detail

```http
GET /api/issuers/6878977dcbbf471de3366e85?start=1&limit=100
```

Issuer detail mengembalikan metadata issuer dan relasi token ke canonical `rwa_id`. Relasi tersebut merupakan metadata CoinMarketCap, bukan verifikasi reserve, redemption rights, atau legal claim.

### Compare

```http
POST /api/compare
Content-Type: application/json

{
  "rwaIds": [1, 2],
  "positionValue": 100000,
  "participationRate": 0.05,
  "stressHaircut": 0
}
```

Compare menerima 2–4 canonical ID unik dan body maksimum 4 KB. Semua aset memakai scenario yang sama. Hasil tersedia diurutkan berdasarkan Estimated Exit Days, sedangkan kegagalan per aset dikembalikan terpisah tanpa menggagalkan hasil lain.

### Dedicated evidence

```http
GET /api/assets/101/evidence?positionValue=100000&participationRate=0.05&stressHaircut=0
```

Evidence response memuat endpoint, parameter non-rahasia, cache/observation status, credit count, feature dependency, metric lineage, normalized excerpt, warning, dan data gaps. Raw header, payload CMC, cache key, serta credential tidak pernah diteruskan.

Scenario defaults adalah $100.000, 5%, dan 0%. Participation rate dibatasi 0,1–20%; haircut 0–90%. Unknown atau duplicate query parameters ditolak.

Kedua endpoint mengembalikan safe DTO dengan envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "...",
    "generatedAt": "...",
    "stale": false
  }
}
```

Error tidak membawa upstream message, stack trace, cache key, header, atau credential. Detail response dapat tetap berhasil ketika metadata, market pairs, atau benchmark tidak tersedia; kekurangan tersebut muncul pada `dataGaps`. Quotes adalah required source.

## 13. Live verification

Setelah `.env.local` memiliki `CMC_API_KEY` dan `DATABASE_URL`, jalankan:

```bash
pnpm verify:live
```

Command menerapkan migration, memanggil dan menormalisasi tujuh endpoint RWA, lalu memverifikasi write/read/delete persistent cache. Supabase dan enam endpoint CMC sudah terverifikasi. `market-pairs/list` masih diblokir subscription plan (`403/1006`), sehingga command tetap gagal secara eksplisit. Detail aman tersedia di `docs/LIVE_SETUP.md`.

## 14. Checklist sebelum demo

- [ ] Endpoint dan parameter dicocokkan kembali dengan dokumentasi terbaru.
- [ ] API key dirotasi jika pernah masuk log atau commit.
- [ ] Secret scanner lulus.
- [ ] Credit usage tercatat.
- [ ] Empty dan error response telah diuji.
- [ ] Evidence Panel menyembunyikan header.
- [ ] Semua endpoint yang digunakan ditulis eksplisit pada submission.
