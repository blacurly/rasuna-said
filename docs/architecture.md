# Arsitektur AIRA Assistant — Document Registry + Hybrid RAG

## Ingestion/indexing
Excel Registry → Supabase `document_registry` → pilih pending/failed → unduh PDF Google Drive
→ SHA-256 → ekstraksi per halaman (PyMuPDF) → OCR selektif → pilih hasil terbaik per halaman
→ cleaning → chunking (1500 karakter, overlap 250) → embedding → simpan `document_chunks`
→ tandai checksum sukses setelah seluruh chunk berhasil diunggah.

## Query-time
Pertanyaan → tentukan apakah perlu referensi → pertanyaan umum: Gemini jalur umum;
pertanyaan yang perlu referensi: embedding pertanyaan → Supabase pgvector → chunk relevan
→ Gemini menjawab berdasarkan konteks → tampilkan sumber bila tersedia.

## Pembagian tanggung jawab
Kalkulator air deterministik tanpa AI. Recommendation System menggunakan katalog CSV dan aturan.
AIRA Assistant memakai LLM dan retrieval dokumen bila dibutuhkan. Document Registry mengelola katalog/status,
bukan mesin retrieval. Google Drive menyimpan PDF sumber; Supabase menyimpan registry, chunk, embedding, status.
