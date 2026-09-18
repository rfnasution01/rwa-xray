# Adaptive Snapshot Worker

RWA X-Ray mengumpulkan histori internal karena endpoint RWA yang digunakan menyediakan data latest. Historical Replay hanya boleh mengklaim periode sejak worker mulai mengumpulkan data.

## Modes

### Broad — setiap 15 menit

```bash
pnpm snapshot:broad
```

- Mengambil maksimal 250 aset global berdasarkan rank.
- Mengambil maksimal 250 government securities berdasarkan volume.
- Menghapus duplikasi berdasarkan canonical `rwa_id`.
- Meng-upsert canonical asset identity; tidak membuat titik analisis historis.
- Record upstream tanpa `rwa_id` dikeluarkan dengan warning, bukan diberi ID buatan.

### Priority — setiap 5 menit

```bash
pnpm snapshot:priority
```

- Memilih top 10 government securities.
- Menambahkan maksimal 20 aset yang dibuka dalam 24 jam terakhir.
- Mengambil quotes secara batch.
- Mengambil market pairs hanya untuk aset prioritas.
- Menyimpan quote, token, pair, dan Analysis Engine result v1.0.0.
- Menggunakan `observed_at` dari dataset sumber, bukan waktu scheduler semata.

Jika Market Pairs mengembalikan `401`, `403`, atau `429`, circuit breaker menghentikan request pair berikutnya pada run tersebut. Quote dan analisis parsial tetap disimpan dengan concentration serta price dispersion berstatus unavailable.

## Scheduling

`.github/workflows/snapshots.yml` menjalankan:

- priority pada cron lima menit;
- broad pada menit 2, 17, 32, dan 47;
- manual dispatch untuk salah satu mode.

Tambahkan repository secrets berikut pada GitHub:

- `CMC_API_KEY`
- `DATABASE_URL` — gunakan Supabase Session Pooler URI.

Jika secret belum tersedia, workflow menjelaskan bahwa snapshot dilewati dan tidak menjalankan worker. API key, database URL, header, dan raw response tidak ditulis ke log.

## Persistence

Migration `drizzle/0001_simple_drax.sql` menambahkan:

- `rwa_tokens`;
- `rwa_market_pairs`;
- `issuers`;
- `analysis_snapshots`;
- `asset_activity`;
- kolom dan index tambahan pada asset/quote.

Snapshot append-only menggunakan unique index berbasis `rwa_id` dan waktu observasi agar retry idempotent. `analysis_snapshots.metrics_json` menyimpan hasil domain terstruktur, methodology version, configuration hash, dan input snapshot IDs.

## Exit behavior

Worker mencetak satu structured JSON summary tanpa payload upstream:

- `success`: semua sumber yang diperlukan berhasil;
- `partial`: optional source tidak tersedia atau tidak ada aset prioritas;
- `failure`: sumber wajib atau persistence gagal total.

Partial run menghasilkan exit code 0 agar scheduler tidak dianggap rusak hanya karena Market Pairs unavailable. Failure menghasilkan exit code 1.

## Current limitations

- Live CMC saat ini mengembalikan dataset kosong untuk `government_security`; priority worker membutuhkan asset view sampai data tersebut tersedia.
- Market Pairs masih diblokir oleh entitlement CMC `403/1006`.
- Retention raw pair 30 hari dan hourly aggregation belum diaktifkan. Data tidak dihapus sampai agregasi tersedia agar histori tidak hilang.
- Historical Replay API/UI belum dibangun.
