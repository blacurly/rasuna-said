# Catatan implementasi dan batasan

- Jalankan `sql/schema.sql` sebelum menjalankan script yang mengakses Supabase.
- `vector(768)` sesuai model `paraphrase-multilingual-mpnet-base-v2`. Model lain perlu dimensi SQL yang sesuai dan re-index seluruh dokumen.
- OCR default mati. Untuk PDF scan, instal binary Tesseract, aktifkan `OCR_ENABLED=true`, dan pastikan bahasa OCR tersedia.
- `needs_rag()` memakai heuristik kata kunci awal, bukan classifier yang sudah dievaluasi. Uji dan sesuaikan dengan pertanyaan AIRA.
- Threshold similarity default hanyalah nilai awal; kalibrasi dengan kumpulan pertanyaan uji.
- Notebook Assistant lama masih memakai prototipe ChromaDB. Integrasi Supabase memerlukan notebook memanggil modul `aira_rag.assistant`/`retriever`.
- Retrieval hanya mengambil chunk yang checksum-nya cocok dengan checksum sukses di registry.
- Uji pada 1–3 dokumen sebelum menjadwalkan pipeline.
