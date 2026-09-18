# Metodologi Analisis

## 1. Tujuan

Dokumen ini mendefinisikan formula RWA X-Ray. Seluruh hasil harus reproducible, versioned, dan dapat dijelaskan. Metrik merupakan alat riset, bukan jaminan likuiditas atau rekomendasi investasi.

## 2. Notasi

| Simbol | Arti                              |
| ------ | --------------------------------- |
| `P`    | nilai posisi pengguna dalam USD   |
| `V`    | tokenized volume 24 jam dalam USD |
| `M`    | tokenized market cap dalam USD    |
| `r`    | participation rate, 0–1           |
| `h`    | stress haircut volume, 0–1        |
| `v_i`  | volume market/token/issuer ke-i   |
| `p_i`  | harga market/token ke-i           |
| `w_i`  | bobot volume ke-i                 |

Semua perbandingan uang harus menggunakan conversion currency yang sama.

## 3. Metrik dasar

### 3.1 Turnover ratio

```text
turnover_ratio = V / M
```

Interpretasi: aktivitas 24 jam relatif terhadap ukuran tokenized market cap.

Ketentuan:

- jika `M <= 0`, hasil `null`;
- volume nol berbeda dengan volume tidak tersedia;
- rasio tinggi tidak otomatis berarti risiko rendah karena volume dapat terkonsentrasi.

### 3.2 Position-to-volume ratio

```text
position_to_volume = P / V
```

Menggambarkan ukuran posisi relatif terhadap volume 24 jam. Jika `V = 0`, hasil tidak terhingga secara matematis tetapi UI menampilkan “no observed capacity”, bukan angka tak hingga.

## 4. Exit Capacity Simulator

### 4.1 Effective volume

```text
effective_volume = V × (1 - h)
```

### 4.2 Daily capacity

```text
daily_capacity = effective_volume × r
```

### 4.3 Estimated exit days

```text
estimated_exit_days = P / daily_capacity
```

Default scenario:

| Nama              | Participation rate |
| ----------------- | -----------------: |
| Konservatif       |                 1% |
| Moderat — default |                 5% |
| Agresif           |                10% |

Nilai posisi default adalah **$100.000**, dengan preset $10K, $100K, $500K, dan $1M. Stress haircut default 0%, dengan preset 0%, 25%, 50%, dan 75%. Custom rate dibatasi 0,1–20% dan custom haircut 0–90% agar UI tidak memberi asumsi ekstrem tanpa warning.

### 4.4 Batas interpretasi

Formula ini **tidak** memodelkan:

- order-book depth;
- slippage dan price impact;
- wash trading atau kualitas volume;
- fee dan gas;
- redemption restriction;
- jam operasional market;
- perubahan volume akibat transaksi;
- kemampuan pengguna mengakses exchange tertentu.

Karena itu, gunakan istilah **capacity estimate** atau **volume participation scenario**, bukan “waktu likuidasi yang dijamin”.

## 5. Concentration

### 5.1 Volume share

Untuk seluruh entitas dengan volume valid:

```text
share_i = v_i / Σv
```

Turunan:

```text
top_1_share = max(share_i)
top_3_share = sum(3 share terbesar)
```

### 5.2 HHI

```text
HHI = Σ(share_i²)
```

HHI normalized untuk `n > 1`:

```text
normalized_HHI = (HHI - 1/n) / (1 - 1/n)
```

Hasil 0–1:

- mendekati 0: lebih terdistribusi;
- mendekati 1: sangat terkonsentrasi.

Jika hanya ada satu observasi, concentration secara faktual maksimum tetapi confidence rendah karena universe mungkin tidak lengkap. UI harus menunjukkan keduanya.

### 5.3 Dimensi concentration

Hitung secara terpisah jika data tersedia:

- market pair;
- exchange;
- token;
- issuer.

Untuk issuer, tampilkan persentase volume yang berhasil dipetakan. Jangan menghasilkan issuer concentration score jika mapped volume kurang dari 80%. Jangan mencampur semua dimensi menjadi satu HHI tanpa label.

### 5.4 Pair freshness

- `≤15 menit`: valid;
- `15–60 menit`: boleh dihitung dengan warning dan penalti confidence;
- `>60 menit`: dikeluarkan dari concentration terkini.

Kebijakan ini berlaku pada data live, bukan snapshot historis.

## 6. Price dispersion

Gunakan harga valid dan bobot volume:

```text
weighted_mean_price = Σ(w_i × p_i), dengan w_i = v_i / Σv
weighted_absolute_deviation = Σ(w_i × |p_i - mean| / mean)
```

Jika volume tidak tersedia, median price dapat ditampilkan sebagai fallback, tetapi metrik harus diberi label unweighted dan confidence lebih rendah.

Buang harga nol/negatif/non-finite. Deteksi anomali dengan median dan Median Absolute Deviation (MAD), tetapi jangan menghapus outlier valid secara diam-diam. Tampilkan metrik raw dan robust secara terpisah serta tandai pair yang terdeteksi sebagai anomali.

## 7. Freshness

```text
age_seconds = calculated_at - source_updated_at
```

Contoh score piecewise untuk data dengan update target 60 detik:

| Umur data | Freshness score |
| --------- | --------------: |
| ≤2 menit  |             100 |
| ≤5 menit  |              80 |
| ≤15 menit |              50 |
| ≤60 menit |              20 |
| >60 menit |               0 |
| unknown   |     unavailable |

Timestamp hingga 5 menit di masa depan ditoleransi sebagai clock skew dan diperlakukan berumur 0. Lebih jauh dari itu mendapat score 0 dan warning. Threshold configurable dan ditampilkan. Data historical snapshot tidak menggunakan threshold latest yang sama.

## 8. Market Cap Mirage Indicator

Indikator ini adalah flag deskriptif, bukan tuduhan manipulasi. Fitur ini ditunda ke P2 dan bukan bagian Analysis Engine awal.

Formula kandidat:

```text
mirage_flag =
  market_cap berada di kuartil atas universe
  AND turnover berada di kuartil bawah universe
  AND salah satu dari:
      top_1_market_share >= 0.70
      num_market_pairs < 3
      confidence < 0.60
```

Gunakan percentile dari universe dan timestamp yang sama. Jika sample universe terlalu kecil, indikator tidak dihitung.

## 9. Health Score

### 9.1 Komponen

| Komponen               | Bobot maksimum |
| ---------------------- | -------------: |
| Activity/turnover      |             30 |
| Market diversification |             30 |
| Price consistency      |             15 |
| Market availability    |             15 |
| Data freshness         |             10 |
| Total                  |            100 |

Semua subscore dinormalisasi 0–100. Threshold awal harus dikalibrasi dari distribusi aktual dataset, bukan dibuat hanya dari intuisi.

### 9.2 Penilaian relatif

Untuk turnover dan availability, gunakan percentile rank dalam kelompok `asset_type` jika tersedia minimal **10 aset valid**. Jika kurang dari 10, gunakan benchmark global dan threshold minimum yang terdokumentasi. UI harus menampilkan sample size dan alasan fallback. Hal ini mencegah perbandingan langsung yang tidak adil antara kelas aset berbeda.

```text
activity_score = percentile_rank(turnover_ratio) × 100
```

Karena transformasi `log1p` monotonik, penggunaannya tidak mengubah percentile rank. Jika category dan global benchmark tidak tersedia, gunakan interpolasi threshold turnover berikut: 0%=0, 0,1%=20, 0,5%=40, 1%=60, 5%=80, dan 10%=100.

Diversification dihitung untuk market, exchange, token, dan issuer yang tersedia, lalu dirata-ratakan:

```text
dimension_score = 100 × (1 - normalized_HHI)
diversification_score = mean(available dimension scores)
```

Price consistency hanya tersedia jika minimal dua harga valid. Gunakan robust dispersion setelah pair berstatus outlier dikeluarkan dari metrik robust, tetapi tetap ditampilkan pada raw observations:

```text
price_consistency_score = 100 × clamp(1 - robust_dispersion / 0.05, 0, 1)
```

Availability menggunakan percentile peer jika tersedia. Fixed fallback menggunakan `100 × log1p(pair_count) / log1p(20)`, dibatasi 0–100.

### 9.3 Missing component

Jangan menganggap missing sebagai nol. Hitung score dari bobot yang tersedia, lalu tampilkan confidence terpisah:

```text
score = Σ(subscore_i × available_weight_i) / Σ(available_weight_i)
```

Score tidak ditampilkan jika bobot data tersedia kurang dari **60%**. UI menampilkan “Insufficient evidence for composite score” dan tetap memperlihatkan metrik individual.

## 10. Confidence Score

Confidence mengukur kelengkapan dan kualitas observasi, bukan kesehatan aset.

Versi awal:

| Faktor                              | Bobot |
| ----------------------------------- | ----: |
| Aggregate quote tersedia            |   25% |
| Source timestamp tersedia dan fresh |   20% |
| ≥2 market pairs dengan volume       |   20% |
| Token breakdown tersedia            |   15% |
| Issuer mapping tersedia             |   10% |
| Cross-field consistency check lulus |   10% |

```text
evidence_coverage = Σ faktor yang terpenuhi
```

Jika ada pair berumur 15–60 menit, faktor market pairs hanya memperoleh 10 dari 20 poin. Pair lebih tua dari 60 menit tidak dihitung. Cross-field consistency memeriksa angka non-negatif, ID market unik, dan konsistensi currency USD. Perbedaan aggregate versus pair volume di atas 50% menghasilkan warning karena cakupan keduanya dapat berbeda.

Label:

- 80–100: High evidence coverage
- 60–79: Moderate evidence coverage
- 0–59: Limited evidence coverage

Jangan menggunakan kata “aman” untuk label confidence.

## 11. Cross-field checks

Peringatan jika:

- aggregate volume dan sum pair volume berbeda secara material;
- source timestamp terlalu jauh antar-endpoint;
- currency conversion berbeda;
- market pair tercatat duplikat;
- issuer/token ID tidak dapat dipetakan;
- harga negatif, nol, atau non-finite;
- `last_updated` berada di masa depan melebihi toleransi clock skew.

Perbedaan tidak selalu merupakan error karena cakupan data dapat berbeda. Jangan melakukan overwrite otomatis tanpa penjelasan.

## 12. Versioning

Setiap hasil menyimpan:

```text
methodology_version = "1.0.0"
calculated_at
input_snapshot_ids
configuration_hash
```

Perubahan threshold minor menaikkan versi minor; perubahan formula utama menaikkan versi major. Shared report harus tetap merujuk versi saat dibuat.

## 13. Contoh

Input:

```text
P = $100,000
V = $2,000,000
M = $100,000,000
r = 5%
h = 50%
```

Hasil:

```text
turnover_ratio = 2,000,000 / 100,000,000 = 2%
effective_volume = 2,000,000 × 50% = $1,000,000
daily_capacity = 1,000,000 × 5% = $50,000
estimated_exit_days = 100,000 / 50,000 = 2 hari
```

Narasi yang benar:

> Dalam skenario volume turun 50% dan partisipasi dibatasi 5% dari volume efektif, posisi setara $100.000 membutuhkan kapasitas sekitar dua hari volume.

Narasi yang salah:

> Anda pasti dapat menjual posisi ini dalam dua hari tanpa slippage.

## 14. Testing minimum

- `M = 0`, `V = 0`, null, negative, dan very large values.
- Participation rate boundary.
- Haircut 0% dan 90%.
- Satu market, banyak market, dan duplicate market.
- HHI terdistribusi sama dan terkonsentrasi penuh.
- Missing timestamp dan stale data.
- Missing component tidak berubah menjadi nol.
- Semua output finite atau null dengan reason code.
