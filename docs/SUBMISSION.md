# Checklist Submission Hackathon

## 1. Persyaratan wajib

- [x] Produk benar-benar berjalan.
- [x] Repository bersifat publik.
- [x] Demo deployment tersedia di `https://rwa-xray.vercel.app`.
- [ ] X post menghubungkan submission dan demo video.
- [ ] Hashtag `#BuildwithCMC` digunakan.
- [ ] Endpoint CMC ditulis eksplisit.
- [ ] Ada bukti code dan response dari API nyata.
- [ ] Ada catatan manfaat dan keterbatasan API.
- [ ] Track **Real World Assets** dipilih.
- [ ] Seluruh anggota tim maksimal empat dan memenuhi syarat usia.

## 2. Konten halaman DoraHacks

### Judul

**RWA X-Ray — Can I Actually Exit?**

### One-liner

> A transparent market-capacity and concentration intelligence tool for tokenized real-world assets, powered by CoinMarketCap.

### Problem

Market cap sering disalahartikan sebagai likuiditas. Investor RWA belum memiliki cara sederhana untuk memahami ukuran posisi relatif terhadap volume, konsentrasi aktivitas, konsistensi harga, dan kualitas data.

### Solution

RWA X-Ray menggabungkan aggregate quote, underlying token, issuer, dan market-pair data untuk menghasilkan exit-capacity scenario, concentration analysis, confidence level, dan Health Score yang sepenuhnya transparan.

### Why CoinMarketCap API matters

Tanpa CMC API, aplikasi harus mengintegrasikan dan menormalisasi banyak token, issuer, market, exchange, serta jenis RWA secara terpisah. RWA endpoint menyediakan stable `rwa_id` dan lapisan agregasi yang memungkinkan analisis lintas-token dan lintas-market.

### Limitations

- Volume adalah proxy aktivitas, bukan order-book depth.
- Simulator tidak menjamin waktu eksekusi atau slippage.
- Cakupan market dapat berbeda antar-aset.
- Histori hanya tersedia sejak snapshot aplikasi mulai dikumpulkan.
- Score bukan rekomendasi investasi.

## 3. Endpoint yang dicantumkan

Centang hanya yang benar-benar dipakai implementasi:

- [x] `GET /v5/real-world-assets/map`
- [x] `GET /v5/real-world-assets/info`
- [x] `GET /v5/real-world-assets/assets/list`
- [x] `GET /v5/real-world-assets/market-pairs/list` — integrated and live-verified with Startup plan
- [x] `GET /v5/real-world-assets/quotes/latest`
- [x] `GET /v5/real-world-assets/issuers/list`
- [x] `GET /v5/real-world-assets/issuers`

Untuk setiap endpoint tulis:

```text
Endpoint:
Feature:
Fields used:
Refresh/cache strategy:
Why it was necessary:
```

## 4. Bukti API

- [ ] Tampilkan CMC client dalam source code.
- [ ] Tampilkan response tersanitasi pada Evidence Panel/video.
- [ ] Tampilkan timestamp dan endpoint.
- [ ] Pastikan key/header tidak terlihat.
- [ ] Jelaskan bagaimana response berubah menjadi metrik.

## 5. Struktur video 2–3 menit

### 0:00–0:20 — Hook

> “A token can have a $100 million market cap—but can you actually exit a $100,000 position?”

### 0:20–0:40 — Masalah

Tunjukkan perbedaan market cap, volume, dan concentration. Jangan mulai dengan tech stack.

### 0:40–1:40 — Demo utama

1. Buka guided demo tokenized government security.
2. Tunjukkan posisi default $100.000 dan participation rate 5%.
3. Jelaskan Estimated Exit Days, Daily Exit Capacity, dan Position-to-Volume Ratio.
4. Aktifkan volume haircut 50%.
5. Tampilkan concentration dan Evidence Coverage.
6. Buka Historical Replay.
7. Bandingkan dengan peer kedua.
8. Generate grounded AI Memo secara on-demand.

### 1:40–2:10 — Bukti API

Buka Evidence Panel dan tunjukkan endpoint, timestamp, response excerpt, serta formula.

### 2:10–2:30 — Dampak

Jelaskan pengguna sasaran, keterbatasan, dan roadmap singkat.

## 6. Optimasi terhadap judging

### Does it work — 30

- [x] Demo URL stabil dan dapat dibuka tanpa akun.
- [x] Skenario default langsung tersedia.
- [x] Error state tidak merusak seluruh halaman.
- [ ] Responsive layouts tersedia; final mobile dan desktop device audit tetap diperlukan.

### Usefulness — 25

- [ ] Persona dan keputusan pengguna jelas.
- [ ] Simulator memakai nominal posisi nyata.
- [ ] Output dapat ditindaklanjuti tanpa menjadi financial advice.

### Interesting API use — 20

- [ ] Bukan sekadar price dashboard.
- [ ] Assets, tokens, issuer, dan pairs digabungkan.
- [ ] Data lineage terlihat.

### Code quality — 15

- [x] Setup berjalan dari README.
- [x] Formula memiliki test.
- [x] Typecheck/lint/CI lulus.
- [x] Architecture, methodology, API usage, dan limitations tersedia.

### Presentation — 10

- [ ] Hook berbasis masalah.
- [ ] Video tidak lebih panjang dari yang diperlukan.
- [ ] Font dan angka terlihat jelas.
- [ ] Tidak ada loading/error saat recording.
- [ ] Subtitle tersedia.

## 7. Template X post

```text
Market cap does not equal liquidity.

We built RWA X-Ray for @CoinMarketCap's API Hackathon: a transparent tool that shows market concentration and estimates volume-based exit capacity for tokenized real-world assets.

Demo: <URL>
Submission: <URL>
Video: <URL>

#BuildwithCMC
```

Sesuaikan mention dan tautan dengan akun/event resmi ketika submission.

## 8. Repository release checklist

- [x] LICENSE dipilih.
- [x] `.env.example` tidak berisi secret.
- [x] `.gitignore` benar.
- [x] Staged tree dipindai sebelum initial commit; CI Gitleaks memindai full history.
- [ ] Fixture API telah disanitasi.
- [ ] README mempunyai screenshot dan live URL.
- [ ] Commit/tag final dibuat.
- [ ] Branch default lulus CI.

## 9. Final smoke test

Lakukan dari browser incognito dan jaringan berbeda:

1. Buka landing page.
2. Buka Explorer.
3. Cari dan pilih aset.
4. Jalankan simulator.
5. Buka Compare.
6. Buka Evidence Panel.
7. Periksa mobile.
8. Periksa semua tautan submission.
9. Pastikan tidak ada API key pada DevTools network response.
10. Simpan screenshot bukti sebelum deadline.
