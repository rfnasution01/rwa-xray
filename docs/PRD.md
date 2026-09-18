# Product Requirements Document — RWA X-Ray

## 1. Ringkasan

**Nama:** RWA X-Ray  
**Tagline:** Can I actually exit?  
**Track:** Real World Assets  
**Platform:** Web responsif  
**Target demo:** 30 September 2026  
**Primary persona:** Treasury/Risk Analyst  
**Initial asset focus:** Tokenized government securities  
**UI language:** English

RWA X-Ray mengubah data RWA CoinMarketCap menjadi alat pengambilan keputusan tentang aktivitas pasar, konsentrasi, dan kapasitas keluar suatu posisi. Aplikasi publik tidak mewajibkan akun pada versi hackathon.

## 2. Problem statement

Pengguna dapat melihat harga, market cap, dan volume RWA, tetapi sulit menjawab:

1. Apakah volume cukup besar dibanding ukuran aset dan posisi saya?
2. Apakah aktivitas bergantung pada satu market, exchange, token, atau issuer?
3. Apakah harga tokenisasi konsisten antarproduk?
4. Seberapa lengkap dan segar data yang mendasari analisis?
5. Aset mana yang lebih sesuai dengan ukuran posisi saya?

Kesenjangan ini menimbulkan ilusi likuiditas: market cap tinggi dipersepsikan sebagai kemudahan keluar, padahal keduanya berbeda.

## 3. Target pengguna

### Persona A — Individual RWA investor

- Memiliki posisi $1.000–$100.000.
- Membandingkan tokenized gold, equity, atau treasury.
- Membutuhkan indikator sederhana dan dapat dijelaskan.

### Persona B — Treasury/risk analyst _(primary)_

- Menilai posisi $100.000–$1 juta, terutama tokenized government securities.
- Membutuhkan rincian market, issuer, dan sumber data.
- Tidak dapat menggunakan skor black-box.

### Persona C — Researcher

- Memetakan perkembangan ekosistem RWA.
- Membutuhkan filter kategori, perbandingan, serta export/share.

## 4. Jobs to be done

- Ketika mempertimbangkan aset RWA, saya ingin mengetahui aktivitas dan konsentrasi pasarnya agar tidak menyamakan market cap dengan likuiditas.
- Ketika menentukan ukuran posisi, saya ingin menguji beberapa participation rate agar memahami kapasitas relatif pasar.
- Ketika membandingkan aset, saya ingin melihat formula dan sumber data agar hasil dapat diverifikasi.
- Ketika data tidak lengkap, saya ingin mengetahuinya secara eksplisit agar tidak memperoleh rasa aman palsu.

## 5. Value proposition

> RWA X-Ray menjelaskan apakah pasar suatu RWA cukup aktif untuk ukuran posisi Anda—dengan formula transparan dan bukti data CoinMarketCap.

## 6. Lingkup MVP

### 6.1 RWA Explorer

**Kebutuhan:**

- Daftar aset dengan pagination.
- Search berdasarkan nama/simbol.
- Filter `asset_type`: stock, commodity, currency, government security, ETF, real estate.
- Sort berdasarkan rank, market cap, volume, dan turnover hasil kalkulasi.
- Tampilkan waktu pembaruan dan status data.

**Acceptance criteria:**

- Data berasal dari backend, bukan API key di browser.
- Empty, loading, stale, rate-limited, dan error state tersedia.
- Pengguna dapat membuka detail aset.

### 6.2 Asset X-Ray

Tampilkan:

- harga tokenisasi rata-rata;
- tokenized market cap;
- tokenized volume 24 jam;
- turnover ratio;
- daftar underlying token dan issuer;
- daftar market pairs;
- konsentrasi volume;
- price dispersion;
- freshness dan confidence;
- Health Score beserta breakdown.

### 6.3 Exit Capacity Simulator

**Input:**

- nominal posisi dalam USD, default $100.000;
- preset posisi $10K, $100K, $500K, dan $1M plus custom input;
- participation rate: 1%, 5% (default), 10%, atau custom 0,1–20%;
- stress haircut 0% (default), 25%, 50%, 75%, atau custom hingga 90%.

**Output:**

- Estimated Exit Days sebagai metrik utama;
- effective daily volume;
- Daily Exit Capacity;
- Position-to-Volume Ratio;
- planning horizon netral: `<1 hari`, `1–3`, `3–7`, atau `>7 hari`;
- disclaimer.

**Acceptance criteria:**

- Kalkulasi deterministik dan diuji.
- Tidak memakai kata “guaranteed”, “safe”, atau estimasi slippage pasti.
- Hasil berubah secara interaktif tanpa panggilan LLM.

### 6.4 Concentration Analysis

- Pangsa volume market terbesar dan top 3.
- Herfindahl–Hirschman Index (HHI) market.
- Pangsa volume token/issuer jika field tersedia.
- Tampilkan “insufficient data” jika observasi kurang dari dua.

### 6.5 Compare Mode

- Pilih maksimal empat aset.
- Sistem menyarankan tiga peer dari kategori sama berdasarkan kemiripan market cap dan volume; pengguna dapat mengganti pilihan.
- Bandingkan metrik dalam USD.
- Gunakan ukuran posisi, participation rate, dan haircut yang sama.
- Default sort berdasarkan Estimated Exit Days terendah tanpa menyebutnya “best asset”.
- Highlight perbedaan, bukan memberi rekomendasi beli/jual.

### 6.6 Evidence Panel

Untuk setiap dataset:

- endpoint;
- parameter non-rahasia;
- waktu request dan `last_updated`;
- cache status;
- credit count jika tersedia;
- cuplikan response yang disanitasi;
- fitur yang bergantung pada dataset.

API key dan header sensitif tidak boleh tampil.

## 7. Stretch goals

Dua prioritas P1 yang disetujui adalah Historical Replay dan Grounded AI Memo.

### 7.1 Grounded AI Memo — P1

AI menerima JSON metrik terstruktur, bukan raw prompt bebas. Memo dibuat on-demand dan berisi:

- Summary;
- Observed Strengths;
- Concentration Risks;
- Stress Scenario;
- Data Gaps.

Setiap klaim angka harus menunjuk metric key. Cache menggunakan hash aset, snapshot, skenario, prompt, dan methodology version. Adapter bersifat provider-agnostic dengan Gemini sebagai implementasi awal. Jika LLM gagal atau data stale, produk inti tetap berfungsi dan memo tidak dibuat.

### 7.2 Historical Replay — P1

Karena referensi RWA saat ini berfokus pada data latest, aplikasi menyimpan snapshot adaptif sendiri. Replay hanya berlaku sejak pengumpulan dimulai dan diberi label jelas. Timeline tersinkronisasi menampilkan Estimated Exit Days, volume/turnover, dan concentration. Default range 7D dengan pilihan 24H dan All Available.

### 7.3 Shareable Scenario URL — optional low-risk

URL dapat menyimpan aset, nominal posisi, participation rate, dan haircut untuk dihitung ulang. Immutable unlisted report ditunda sampai P0 dan dua P1 prioritas stabil.

### 7.4 Alert — P2

Peringatan ketika turnover, konsentrasi, freshness, atau confidence melewati threshold pengguna.

## 8. Di luar lingkup

- Eksekusi trading.
- Prediksi harga.
- Rekomendasi beli/jual.
- Estimasi slippage tanpa order-book depth.
- Verifikasi legal ownership atau redemption rights.
- Audit reserve issuer.
- KYC, custody, atau wallet management.
- Klaim mendeteksi scam.

## 9. Alur utama demo

1. Pengguna membuka Explorer.
2. Memilih sebuah tokenized asset.
3. Melihat market cap besar tetapi concentration tinggi.
4. Memasukkan posisi `$500,000`.
5. Mengubah participation rate dari 10% menjadi 1%.
6. Mengaktifkan stress haircut 70%.
7. Estimasi hari keluar meningkat dan confidence dijelaskan.
8. Pengguna membuka Evidence Panel untuk melihat endpoint dan response aktual.
9. Pengguna membandingkan aset kedua dengan input yang sama.

## 10. Non-functional requirements

### Security

- API key hanya di server environment.
- Secret scanning aktif pada CI.
- Log tidak menyimpan header autentikasi.
- Input query divalidasi dan dibatasi.

### Performance

- Explorer cached maksimal 60 detik mengikuti update frequency sumber.
- Auto-refresh setiap 60 detik hanya saat tab aktif, dengan manual refresh.
- Real cached data boleh ditampilkan maksimal 24 jam saat upstream gagal dengan stale warning; AI dinonaktifkan.
- Detail pertama ditargetkan tampil <2 detik saat cache hit.
- Kalkulasi client-side <100 ms.

### Reliability

- Retry hanya untuk error sementara dengan exponential backoff.
- Hormati `429`; jangan retry agresif.
- Data stale tetap boleh tampil dengan label waktu dan warning.

### Accessibility

- Navigasi keyboard.
- Kontras WCAG AA.
- Score tidak hanya dibedakan dengan warna.
- Chart memiliki ringkasan teks/tabel.

## 11. Analytics keberhasilan

Tanpa menyimpan data sensitif:

- jumlah asset detail dibuka;
- penggunaan simulator;
- penggunaan compare;
- Evidence Panel dibuka;
- report dibagikan;
- error rate dan cache hit rate.

## 12. Risiko produk

| Risiko                                | Mitigasi                                                   |
| ------------------------------------- | ---------------------------------------------------------- |
| Volume dianggap sama dengan liquidity | Gunakan istilah capacity proxy dan disclaimer              |
| Data pair terlalu sedikit             | Turunkan confidence dan hindari skor concentration palsu   |
| API credits habis                     | Cache, batching, pagination, dan request deduplication     |
| LLM membuat klaim                     | JSON schema, allowlist metrik, validasi angka, AI opsional |
| Data historis tidak tersedia          | Simpan snapshot sendiri dan nyatakan periode cakupan       |
| Score dianggap rekomendasi            | Breakdown transparan dan tanpa label buy/sell              |

## 13. Definition of done

- Alur explorer → detail → simulator → compare berjalan di deployment publik.
- Minimal tiga jenis aset dapat dianalisis.
- Semua formula memiliki unit test.
- Evidence Panel menampilkan API call yang disanitasi.
- API key tidak ditemukan oleh secret scanner.
- README, methodology, API usage, limitation, dan demo video tersedia.
