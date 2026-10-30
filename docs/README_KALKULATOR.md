# Kalkulator Ketahanan Air AIRA

Notebook: `notebooks/01_kalkulator_air_pipeline_supabase_fixed.ipynb`

## Fungsi
- Validasi input rumah tangga.
- Menghitung kebutuhan harian, volume cadangan, dan estimasi durasi.
- Menetapkan status menggunakan aturan Python yang deterministik.
- Mengambil tindakan dari tabel Supabase `katalog_tindakan`.
- Menyediakan rekomendasi rule-based dan opsi pemilihan/penyusunan urutan oleh Gemini dengan guardrail serta fallback.

## Kebutuhan
```bash
pip install -r requirements-calculator.txt
```
Di Google Colab, sel instalasi notebook juga dapat digunakan. Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `GEMINI_API_KEY` (opsional untuk AI).

## File penting
- `src/aira_calculator_shared.py`: sumber tunggal rumus dan klasifikasi status.
- `data/catalog/AIRA_Katalog_Tindakan_Final_REVISED.csv`: cadangan katalog untuk reviewer; sumber utama run yang disertakan adalah Supabase.
- `notebooks/01_kalkulator_air_pipeline_supabase_fixed.ipynb`: notebook beserta output run.

## Menjalankan
Jalankan notebook dari atas ke bawah. Pastikan output menyebut `Supabase (tabel katalog_tindakan)` bila ingin mereproduksi sumber katalog run. Jika Colab meminta modul bersama, unggah `src/aira_calculator_shared.py`.

## Hasil run yang tercatat
Katalog Supabase 77/77 aktif; 35 pemeriksaan katalog lulus; 11 pengujian status/validasi lulus; 15 pengujian lapisan AI simulasi lulus. Skenario utama menghasilkan kebutuhan 70 L/hari, cadangan 450 L, durasi 6,43 hari, dan status akhir Waspada karena sumber terbatas.

## Batasan
Angka kebutuhan, alokasi tambahan MHM, dan ambang status merupakan asumsi prototipe. Hasil tidak menunjukkan kualitas atau keamanan air untuk diminum. Rekomendasi harus ditinjau manusia dan pakar.
