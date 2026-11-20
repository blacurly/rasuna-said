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


## UAT tambahan — CRUD dan integritas relasi

### Rumah tangga
- [ ] User A dapat membaca dan memperbarui rumah tangganya sendiri.
- [ ] User A tidak dapat membaca/mengubah/menghapus rumah tangga User B (uji ID langsung).
- [ ] PATCH menolak nama kosong, jumlah anggota di luar 1–30, kapasitas negatif, dan sumber air di luar pilihan.
- [ ] DELETE berhasil hanya jika tidak ada `household_members`, `water_assessments`, atau `assistant_interactions` terkait.
- [ ] DELETE mengembalikan 409 jika masih ada data turunan.

### Riwayat asesmen
- [ ] User hanya dapat membaca/mengubah/menghapus asesmen miliknya.
- [ ] PATCH hanya menerima `assessment_notes` maksimal 2.000 karakter.
- [ ] PATCH tidak mengubah nilai kalkulasi maupun `input_snapshot`.
- [ ] DELETE mengembalikan 409 jika ada rekomendasi atau interaksi Assistant terkait.

### Kontribusi
- [ ] User hanya dapat melihat kontribusinya sendiri.
- [ ] Kontribusi `needs_revision` dapat diperbaiki dan dikirim ulang; ID kontribusi tetap sama dan status kembali ke `pending`.
- [ ] Kontribusi `pending` tanpa review dapat dibatalkan.
- [ ] Kontribusi yang telah memiliki review tidak dapat dihapus.
- [ ] User tidak dapat mengubah status menjadi `approved` atau memublikasikan titik air.
- [ ] Setelah admin menyetujui kontribusi, titik air publik hanya muncul jika lolos aturan verifikasi dan aktif.

### Swagger
- [ ] Seluruh route handler terdaftar pada `/api/openapi`.
- [ ] Request body, path/query parameter, response sukses, response error, dan autentikasi sesuai implementasi.
- [ ] Endpoint privat diuji setelah login pada origin yang sama dengan Swagger UI.

### Database / RLS (wajib sebelum production)
- [ ] RLS aktif dan policies diuji untuk user A, user B, dan admin.
- [ ] User tidak dapat mengubah data milik user lain melalui Supabase client maupun REST API.
- [ ] Hanya admin aktif yang dapat memproses review dan mengelola titik air.

## Admin — Kelola Titik Air
- [ ] Admin aktif dapat mengambil daftar titik air dengan pagination.
- [ ] Filter daftar berdasarkan nama, status verifikasi, ketersediaan, dan status aktif.
- [ ] Admin aktif dapat menambahkan titik air dengan payload valid.
- [ ] Payload invalid ditolak dengan status 422.
- [ ] User non-admin dan sesi tanpa login ditolak (403/401).
- [ ] Admin dapat mengambil detail titik air berdasarkan ID.
- [ ] Admin dapat memperbarui field yang diizinkan.
- [ ] DELETE menonaktifkan (`is_active=false`), bukan menghapus permanen.
- [ ] Titik nonaktif tidak muncul pada daftar publik `/api/water-navigation`.
- [ ] OpenAPI JSON menampilkan operasi CRUD admin water points.
