# AIRA Assistant Hybrid — Supabase RAG

Notebook: `notebooks/02_aira_assistant_hybrid_supabase_final.ipynb`

## Fungsi
- Membaca metadata dari Supabase `document_registry`.
- Mengunduh PDF dari Google Drive.
- Mengekstrak teks menggunakan PyMuPDF dan OCR Tesseract bila diperlukan.
- Memecah teks menjadi chunk (1500 karakter, overlap 250).
- Membuat embedding 768 dimensi dengan `sentence-transformers/paraphrase-multilingual-mpnet-base-v2`.
- Menyimpan chunk dan embedding di Supabase `document_chunks`.
- Mengambil konteks dengan RPC `match_document_chunks()` dan menjawab melalui Gemini dengan guardrails.

## Kebutuhan
```bash
pip install -r requirements-assistant.txt
```
Tesseract adalah binary sistem operasi, bukan paket pip. Pada Colab, notebook memasang Tesseract dan bahasa `ind`/`eng` menggunakan `apt-get`.

Secrets: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Untuk akses Google Drive privat, siapkan service account dan konfigurasi sesuai implementasi unduh.

## File penting
- `sql/schema.sql`: skema registry, chunks, vector index, dan RPC retrieval.
- `data/document_registry/`: template/ekspor metadata registry.
- `notebooks/02_aira_assistant_hybrid_supabase_final.ipynb`: notebook beserta output run.
- `src/aira_calculator_shared.py`: modul kalkulator bersama untuk integrasi konteks status.

## Hasil run yang tercatat
11/11 dokumen berstatus completed dengan 918 chunk. Uji chatbot otomatis 9/9 lulus. Rata-rata waktu respons tercatat 12,6 detik. Uji retrieval menghasilkan jarak top-1 0,172–0,276 untuk pertanyaan relevan dan 0,547 untuk kontrol negatif; ambang 0,41 adalah nilai awal yang harus diuji ulang, bukan parameter final. Angka 9/9 dan rata-rata 12,6 detik berasal dari run sebelum ambang diubah dari 0,65 ke 0,41.

## Hal yang masih perlu diperbaiki
- Saring chunk sampul, alamat, dan boilerplate agar tidak mengganggu retrieval.
- Evaluasi `MAX_DISTANCE` dengan pertanyaan relevan dan kontrol negatif yang lebih banyak; K1-1 memiliki jarak 0,592.
- Lakukan penilaian manual atas isi jawaban dan ketepatan sumber; 9/9 adalah hasil cek otomatis saja.
- Periksa kualitas OCR pada halaman isi, terutama tabel/formulir.
- Ukur latensi embedding, RPC Supabase, dan Gemini secara terpisah.
- Jangan menyatakan lokasi atau ketersediaan titik air yang belum terhubung dan diverifikasi.
