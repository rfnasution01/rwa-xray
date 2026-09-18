# Production Deployment

Target deployment RWA X-Ray adalah Vercel dengan Supabase PostgreSQL dan snapshot scheduler di GitHub Actions. Dokumen ini tidak menyimpan nilai credential.

## 1. Prasyarat

- Repository publik telah dibuat dan dihubungkan ke project ini.
- Project Vercel mengimpor repository tersebut.
- Supabase migration `drizzle/0000_big_malice.sql` dan `drizzle/0001_simple_drax.sql` telah diterapkan.
- CMC API key aktif.
- Node.js 22 dan pnpm 11 digunakan. Versi ini dikunci melalui `package.json`.

Jangan menjalankan migration otomatis pada setiap Vercel build. Preview dan production build dapat berjalan bersamaan sehingga migration harus menjadi release step terkontrol.

## 2. Vercel project settings

Gunakan deteksi framework Next.js standar:

| Setting          | Value                  |
| ---------------- | ---------------------- |
| Framework Preset | Next.js                |
| Root Directory   | repository root        |
| Install Command  | `pnpm install` default |
| Build Command    | `pnpm build`           |
| Node.js Version  | 22.x                   |

Tidak diperlukan `vercel.json`. Route handlers membutuhkan Node.js runtime dan aplikasi bukan static export.

## 3. Environment variables

Atur melalui **Vercel Project → Settings → Environment Variables**, bukan melalui file yang di-commit.

| Variable                   | Required | Scope                  | Notes                                                       |
| -------------------------- | -------- | ---------------------- | ----------------------------------------------------------- |
| `CMC_API_KEY`              | Ya       | Preview dan Production | Server-only; gunakan key terpisah jika tersedia.            |
| `CMC_API_BASE_URL`         | Ya       | Preview dan Production | `https://pro-api.coinmarketcap.com`.                        |
| `DATABASE_URL`             | Ya       | Preview dan Production | Supabase pooler URI; jangan gunakan direct IPv6-only host.  |
| `NEXT_PUBLIC_APP_URL`      | Ya       | Per environment        | Public canonical origin; nilai ini memang terlihat browser. |
| `AI_PROVIDER`              | Opsional | Preview dan Production | `gemini`; adapter AI belum diaktifkan.                      |
| `GEMINI_API_KEY`           | Opsional | Preview dan Production | Server-only; biarkan unset sampai AI diaktifkan.            |
| `SENTRY_DSN`               | Opsional | Preview dan Production | SDK monitoring belum diintegrasikan.                        |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Opsional | Preview dan Production | Analytics belum diintegrasikan.                             |
| `NEXT_PUBLIC_POSTHOG_HOST` | Opsional | Preview dan Production | Analytics belum diintegrasikan.                             |

Jangan menyalin `DATABASE_URL` production ke preview jika database preview terpisah tersedia. Web runtime menggunakan `prepare: false`, sehingga kompatibel dengan Supabase pooler. Gunakan Session Pooler port 5432 untuk migration terkontrol; runtime serverless dapat memakai pooler yang direkomendasikan Supabase untuk workload serverless.

`/api/health` memvalidasi bahwa required server environment dapat diparse, tetapi tidak menghubungi vendor. Production smoke test kemudian memanggil Explorer untuk memverifikasi CMC dan database/cache path.

## 4. Migration release step

Dari trusted machine atau protected CI environment:

```bash
DATABASE_URL='<session-pooler-uri>' pnpm db:migrate
```

Jangan menaruh URI pada command history jika shell tidak aman. Alternatif yang lebih aman adalah memasangnya sebagai masked environment secret. Setelah migration berhasil, deploy aplikasi.

## 5. Deploy

Pilihan utama adalah Git integration Vercel:

1. Push branch ke repository.
2. Pastikan CI lulus.
3. Tinjau Preview Deployment.
4. Merge ke `main` untuk Production Deployment.
5. Pastikan custom domain dan HTTPS aktif.

Vercel CLI tidak wajib. Jika digunakan, autentikasi dan `.vercel/` tetap lokal; direktori tersebut sudah diabaikan Git.

## 6. Snapshot scheduler

Vercel tidak menjalankan worker snapshot. Tambahkan repository secrets berikut di GitHub:

- `CMC_API_KEY`
- `DATABASE_URL`

Gunakan Supabase pooler URI yang dapat dijangkau GitHub-hosted runner. Workflow `.github/workflows/snapshots.yml` tidak mencetak nilai secret dan dapat diuji manual melalui **Actions → RWA snapshots → Run workflow**.

## 7. Production smoke test

Jalankan setelah deployment:

```bash
pnpm smoke:production -- https://your-production-domain.example
```

Atau gunakan workflow manual **Production smoke** dan masukkan origin HTTPS. Harness memeriksa:

- landing, Explorer, Compare, dan Methodology;
- readiness endpoint;
- Explorer, detail, Evidence, dan Compare APIs;
- JSON envelope dan forbidden sensitive field names;
- CSP, HSTS, anti-framing, MIME sniffing, referrer, permissions, dan opener headers;
- tidak adanya `X-Powered-By`.

Harness hanya mencetak status/count, bukan response payload atau credential. Jika hanya satu aset canonical tersedia, Compare dilewati dan dilaporkan sebagai `false`.

## 8. Security headers

`next.config.ts` menerapkan CSP allowlist same-origin, `frame-ancestors 'none'`, HSTS production, `X-Frame-Options: DENY`, `nosniff`, restrictive Permissions Policy, dan menghapus framework disclosure header.

CSP saat ini sengaja hanya mengizinkan koneksi same-origin karena browser memanggil internal API. Ketika Sentry atau PostHog benar-benar diintegrasikan, tambahkan hanya origin vendor yang diperlukan ke directive terkait dan verifikasi ulang melalui browser—jangan membuka wildcard global.

## 9. Manual release checks

- Buka URL dengan incognito dan perangkat/jaringan lain.
- Pastikan DevTools Network hanya memperlihatkan internal `/api/*`; tidak ada CMC key atau database URI.
- Periksa stale/partial-data label jika Market Pairs tetap `403/1006`.
- Jalankan mobile viewport dan keyboard navigation.
- Periksa Vercel logs untuk error yang sudah disanitasi.
- Rotasi credential segera jika pernah terlihat di log, screenshot, atau git history.

## 10. Rollback

Jika smoke test gagal:

1. Jangan mengganti real data dengan fixture production.
2. Promosikan deployment Vercel terakhir yang sehat atau rollback commit.
3. Pertahankan snapshot scheduler hanya jika schema tetap kompatibel.
4. Perbaiki root cause pada preview, jalankan CI dan smoke test, lalu promote ulang.
