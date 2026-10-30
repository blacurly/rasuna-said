# AIRA Pipeline AI

Repository ini menggabungkan dua notebook prototipe AIRA yang saling terhubung:

1. **Kalkulator Ketahanan Air** — menghitung kebutuhan dan estimasi durasi cadangan, menetapkan status secara deterministik, lalu memilih rekomendasi dari katalog tindakan Supabase dengan opsi penyusunan urutan oleh Gemini.
2. **AIRA Assistant Hybrid (RAG)** — membaca Document Registry dari Supabase, mengambil dokumen PDF dari Google Drive, melakukan ekstraksi teks/OCR, chunking dan embedding, menyimpan chunk di Supabase pgvector, lalu menjawab pertanyaan dengan retrieval dan guardrails.

Keduanya direkomendasikan berada dalam **satu repository (monorepo)** karena menggunakan modul `src/aira_calculator_shared.py` yang sama. Dengan satu sumber rumus, perubahan klasifikasi status tidak perlu disalin dan diselaraskan manual di dua repository berbeda.

## Status berdasarkan eksekusi notebook

Eksekusi yang disertakan berasal dari 30 Oktober 2026. Angka berikut adalah hasil run yang tercatat, bukan klaim bahwa seluruh sistem sudah siap produksi.

### Kalkulator Ketahanan Air
- Katalog tindakan berhasil dibaca dari Supabase: **77 baris (77 aktif)**.
- Skenario utama: 4 anggota keluarga, 2 anggota membutuhkan MHM, kebutuhan 70 L/hari, cadangan 450 L, estimasi 6,43 hari, status akhir **Waspada** karena sumber utama terbatas.
- Pemeriksaan katalog: **35/35 lulus**.
- Pengujian status dan validasi: **11/11 lulus**.
- Pengujian lapisan AI simulasi: **15/15 lulus**.
- Gemini `gemini-3.8-flash` sempat menerima HTTP 429; sistem beralih dan berhasil memakai `gemini-3.6-flash`.

### AIRA Assistant Hybrid
- Document Registry: **11/11 dokumen completed**.
- Jumlah chunk pada versi checksum terakhir: **918**.
- Uji chatbot: **9/9 lulus cek otomatis**.
- Rata-rata waktu respons pada run: **12,6 detik**.
- Uji retrieval memberi jarak top-1 0,172–0,276 untuk empat pertanyaan relevan dan 0,547 untuk satu kontrol negatif. Notebook kini menyetel `MAX_DISTANCE = 0.41` sebagai ambang awal berdasarkan uji retrieval. Catatan 9/9 kasus chatbot dan rata-rata 12,6 detik berasal dari run sebelumnya saat ambang masih 0,65; jalankan ulang bagian 8–10 sebelum memakai angka tersebut sebagai hasil final konfigurasi baru. Satu pertanyaan chatbot K1-1 memiliki jarak 0,592.
- Pemeriksaan manual atas isi jawaban tetap diperlukan. Lulus otomatis tidak membuktikan seluruh jawaban akurat atau sesuai sumber.

## Struktur folder yang direkomendasikan

```text
aira-pipeline-ai/
├── README.md
├── requirements.txt
├── requirements-calculator.txt
├── requirements-assistant.txt
├── .env.example
├── .gitignore
│
├── notebooks/
│   ├── 01_kalkulator_air_pipeline_supabase_fixed.ipynb
│   └── 02_aira_assistant_hybrid_supabase_final.ipynb
│
├── src/
│   ├── aira_calculator_shared.py
│   └── aira_rag/
│       ├── __init__.py
│       ├── assistant.py
│       ├── chunking.py
│       ├── clients.py
│       ├── config.py
│       ├── embeddings.py
│       ├── fetch.py
│       ├── pdf_processing.py
│       ├── pipeline.py
│       ├── registry.py
│       ├── retriever.py
│       └── storage.py
│
├── data/
│   ├── catalog/
│   │   └── AIRA_Katalog_Tindakan_Final_REVISED.csv
│   ├── document_registry/
│   │   ├── Document_Registry.csv
│   │   ├── AIRA_Document_Registry.xlsx
│   │   └── README.md
│   └── processed/
│       └── .gitkeep
│
├── sql/
│   └── schema.sql
├── scripts/
│   ├── import_registry.py
│   ├── run_pipeline.py
│   ├── validate_config.py
│   └── validate_registry.py
├── tests/
│   └── README.md
├── docs/
│   ├── architecture.md
│   ├── implementation_notes.md
│   ├── README_KALKULATOR.md
│   └── README_ASSISTANT.md
└── .github/
    └── workflows/
        └── run_pipeline.yml
```

**Catatan struktur:**
- Notebook tetap di `notebooks/`; tidak perlu menaruh seluruh file proyek di dalam satu folder notebook.
- `src/aira_calculator_shared.py` adalah sumber tunggal rumus dan klasifikasi status untuk kedua notebook.
- `src/aira_rag/` dan `scripts/` adalah jalur kode modular/opsional untuk pengembangan lanjutan. Alur notebook yang sudah diuji tetap menjadi bukti eksekusi utama; jangan menganggap semua script modular sudah tervalidasi end-to-end hanya karena notebook berhasil.
- `data/processed/` untuk artefak sementara. Jangan commit PDF hasil unduhan atau file berukuran besar.
- `data/document_registry/` menyimpan template/ekspor metadata, bukan kredensial.
- Detail tiap notebook ada di `docs/README_KALKULATOR.md` dan `docs/README_ASSISTANT.md`.

## Memulai

### 1. Siapkan environment
Disarankan Python 3.10–3.12. Buat virtual environment, lalu instal sesuai notebook yang ingin dijalankan:

```bash
python -m venv .venv
# Windows:
.venv\\Scripts\\activate
# macOS/Linux:
source .venv/bin/activate

# Pilih salah satu:
pip install -r requirements-calculator.txt
pip install -r requirements-assistant.txt

# Atau instal seluruh dependensi:
pip install -r requirements.txt
```

Untuk Google Colab, sel instalasi pada notebook tetap dapat digunakan. `requirements-*.txt` disediakan untuk lingkungan lokal/repository.

### 2. Siapkan secrets
Salin `.env.example` menjadi `.env` untuk penggunaan lokal, atau simpan nilai yang sama di Colab Secrets. Jangan commit `.env`.

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — hanya untuk notebook/server privat; jangan pernah dipakai pada frontend.
- `GEMINI_API_KEY` — opsional untuk Kalkulator, diperlukan untuk jawaban Assistant.
- `GOOGLE_SERVICE_ACCOUNT_FILE` atau `GOOGLE_SERVICE_ACCOUNT_JSON` — untuk pipeline unduh Google Drive pada jalur modular.

### 3. Siapkan Supabase
Jalankan `sql/schema.sql` untuk membuat `document_registry`, `document_chunks`, indeks pgvector, dan RPC `match_document_chunks()`. Pastikan tabel `katalog_tindakan` telah tersedia untuk notebook Kalkulator.

RLS aktif pada tabel dokumen. Service role key melewati RLS dan harus dijaga privat. Jangan menambahkan policy publik tanpa meninjau kebutuhan akses dan keamanan.

### 4. Jalankan notebook
Buka notebook dari folder `notebooks/` di Google Colab/Jupyter. Jalankan sel berurutan dari atas ke bawah. Bila notebook meminta `aira_calculator_shared.py`, unggah file dari `src/`.

Simpan notebook dengan output run yang relevan. Sebelum membagikan ke publik, periksa output agar tidak mengandung API key, URL privat, atau data pribadi.

## Dependensi khusus OCR
Notebook Assistant memasang Tesseract pada Google Colab menggunakan `apt-get`. Untuk lokal, instal binary Tesseract dan bahasa `ind` serta `eng` secara terpisah dari pip. Paket Python `pytesseract` saja tidak memasang binary Tesseract.

## Keamanan dan batasan
- Jangan commit `.env`, service-account JSON, API key, service role key, atau dokumen PDF yang hak distribusinya terbatas.
- Katalog tindakan dan metadata dokumen harus ditinjau serta diperbarui oleh tim.
- Estimasi kalkulator adalah estimasi kuantitas/durasi, bukan pengujian kualitas air.
- Acuan 15 L/orang/hari, tambahan operasional MHM 5 L/orang/hari, dan ambang 1 serta 3 hari masih asumsi prototipe yang perlu divalidasi.
- `MAX_DISTANCE` retrieval adalah parameter empiris. Gunakan kumpulan pertanyaan berlabel dan penilaian manual sebelum menetapkan nilai produksi.
- Notebook berhasil dijalankan tidak otomatis membuktikan modul modular di `src/aira_rag/` dan workflow GitHub Actions telah diuji penuh.
