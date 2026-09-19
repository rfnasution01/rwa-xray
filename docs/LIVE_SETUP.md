# Live Infrastructure Setup

Dokumen ini menjelaskan verifikasi CoinMarketCap dan Supabase tanpa mengekspos credential.

## 1. Buat environment lokal

Salin template:

```bash
cp .env.example .env.local
```

Isi hanya pada mesin lokal:

```dotenv
CMC_API_KEY=<CoinMarketCap key>
CMC_API_BASE_URL=https://pro-api.coinmarketcap.com
DATABASE_URL=<Supabase direct PostgreSQL connection string>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Jangan mengirim nilai tersebut melalui chat, screenshot, issue, log, atau commit. `.env.local` sudah diabaikan Git.

Untuk migration, gunakan direct/session PostgreSQL connection yang mendukung migration. Runtime serverless nantinya dapat menggunakan pooler yang sesuai.

## 2. Jalankan verifikasi

```bash
pnpm verify:live
```

Command tersebut:

1. Memuat `.env.local` menggunakan `@next/env`.
2. Menjalankan seluruh migration Drizzle.
3. Memilih tokenized government-security RWA jika tersedia, lalu memakai tokenized RWA lain sebagai fallback khusus infrastructure test.
4. Memanggil dan menormalisasi ketujuh endpoint RWA.
5. Melakukan write/read/delete pada `cmc_cache_entries`.
6. Membersihkan verification entry.

Script tidak mencetak API key atau database URL. Error sengaja disanitasi.

## Status verifikasi terakhir

- Migration Supabase berhasil melalui Session Pooler port 5432.
- Persistent cache write/read/delete berhasil.
- Direct connection hanya menyediakan IPv6 pada project yang diuji dan tidak stabil dari jaringan lokal; Session Pooler menjadi konfigurasi lokal aktif.
- Seluruh tujuh endpoint CMC berhasil diakses dan dinormalisasi.
- `market-pairs/list` berhasil melalui Startup plan; response live dengan field plural `market_pair_quotes` juga tercakup parser.
- Filter live `government_security` saat verifikasi dapat mengembalikan dataset kosong; harness memakai RWA tokenized lain hanya untuk memverifikasi infrastruktur.

`pnpm verify:live` lulus ketika API, database, dan seluruh endpoint wajib tersedia.

## 3. Command terpisah

```bash
pnpm db:migrate
pnpm test:live
```

Unit test biasa tidak memanggil layanan eksternal:

```bash
pnpm test
```

## 4. Troubleshooting aman

- **CMC verification failed:** pastikan key aktif, tier memiliki akses, dan endpoint contract belum berubah.
- **Database verification failed:** pastikan connection string benar, IP/network diizinkan, dan migration berhasil.
- **Jangan** menambahkan `console.log(process.env)` atau mencetak request headers.
- Jika key pernah terekspos, rotasi segera sebelum melanjutkan.
