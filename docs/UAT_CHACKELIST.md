# AIRA — Checklist UAT Backend

Tanggal baseline: 19 November 2026  
Status awal: Belum diuji end-to-end pada environment Supabase/Vercel milik tim.

| ID | Skenario | Langkah ringkas | Kriteria lulus | Hasil |
|---|---|---|---|---|
| TEST-01 | Autentikasi | Uji endpoint privat tanpa login, sebagai user, dan sebagai admin | 401 tanpa sesi; user ditolak dari endpoint admin; admin aktif diizinkan | Belum diuji |
| TEST-02 | Kontribusi | Login user, kirim kontribusi valid, periksa row di Supabase | Satu row tersimpan dan field input tidak hilang | Belum diuji |
| TEST-03 | Identitas pengirim | Bandingkan `contributor_user_id` dengan `auth.uid()` dan nama profil | ID cocok dan nama di detail admin berasal dari `users.full_name` | Belum diuji |
| TEST-04 | Pengelola | Kirim nama pengelola dan nomor HP valid/kosong/tidak valid | Nama tersimpan; nomor hanya ditautkan jika valid | Belum diuji |
| TEST-05 | Google Maps | Uji URL Maps panjang, short link, koordinat valid, koordinat di luar rentang | URL tidak rusak; koordinat valid tersimpan berpasangan; invalid ditolak | Belum diuji |
| TEST-06 | Verifikasi | Admin approve, reject, dan needs_revision | Status sesuai keputusan; data publik hanya muncul setelah approve/verified | Belum diuji |
| TEST-07 | Input admin | Admin membuat titik air baru | Data langsung tersedia publik, tidak masuk antrean user, admin tercatat | Terblokir: alur tambah admin dan kontrak audit/database perlu dilengkapi |
| TEST-08 | GeoMeteo/Open-Meteo | Uji lokasi tersedia, tidak ditemukan, dan API gagal | Kalkulator tetap berjalan; tidak memakai data wilayah lain; status estimasi jelas | Belum diuji |
| TEST-09 | Assistant | Uji RAG normal, retrieval gagal, Gemini gagal, timeout | Response konsisten; timeout 504; tidak mengarang sumber | Belum diuji |
| TEST-10 | RLS | Coba baca/tulis data user lain dan mutasi anonim | Akses lintas user/anon ditolak sesuai kebijakan | Terblokir: perlu policy SQL aktual dan akun uji |
| TEST-11 | API | Uji method, body invalid, auth, status code, response shape | Sesuai kontrak OpenAPI dan dokumentasi | Belum diuji |
| TEST-12 | Build | `npm ci`, `npm test`, `npm run lint`, `npm run build` | Semua perintah selesai tanpa error | Belum diuji di sesi audit: instalasi dependency timeout |

## Bukti yang harus dicatat saat UAT

- Waktu pengujian dan URL environment (Preview/Production).
- Akun uji berdasarkan role (jangan tulis password/token).
- Request dan response API yang sudah disamarkan.
- ID row yang dibuat untuk memudahkan pengecekan Supabase.
- Screenshot hasil UI bila diperlukan.
- Hasil aktual: Pass / Fail / Blocked, langkah reproduksi, dan catatan.

## Catatan penting

- Jangan melakukan UAT input admin sebelum kontrak tabel, unique constraint anti-duplikasi, dan audit log dipastikan.
- Jangan menyatakan RLS lulus hanya karena UI menyembunyikan menu; uji langsung dengan sesi dan query API.
- Jangan menguji approve/reject pada data produksi tanpa persetujuan tim.
