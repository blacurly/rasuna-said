# Audit dan Backlog Backend AIRA — WEBSITE-AIRA-new.zip

Tanggal pemeriksaan: 20 November 2026  
Basis pemeriksaan: `aira-website` ditambah export schema SQL.

## Ringkasan hasil pemeriksaan

### Sudah tersedia di source code
- Next.js App Router menggunakan JavaScript.
- Pemisahan dasar Route Handler, Server Action, service, helper, dan komponen UI.
- Supabase Auth digunakan untuk mengambil identitas pengguna di sisi server.
- Helper `requireApiUser()` dan `requireApiAdmin()` memeriksa sesi, status akun, role, dan pemeriksaan admin melalui RPC.
- Terdapat role `user` dan `admin`.
- Kalkulator memiliki validasi input dan perhitungan deterministik.
- Kontribusi titik air disimpan sebagai usulan; tidak langsung menulis ke direktori titik air publik.
- Admin memutuskan kontribusi melalui `review_water_point_contribution`.
- Navigasi publik memfilter titik air aktif, terverifikasi, dan bukan simulasi.
- AIRA Assistant menggunakan retrieval dokumen dan Gemini; hasil menyertakan mode dan metadata sumber.
- Swagger UI tersedia pada `/api-docs` dan spesifikasi JSON pada `/api/openapi`.

### Perbaikan yang dilakukan pada paket audit ini
- Spesifikasi OpenAPI diperluas dengan security scheme sesi Supabase, tag per domain, schema request/response, contoh request/response, parameter query/path, serta response error yang lebih konsisten.
- OpenAPI hanya mencantumkan operasi yang benar-benar tersedia; tidak mengiklankan endpoint CRUD yang belum diimplementasikan.
- `POST /api/assistant` kini memvalidasi bentuk `history`, maksimal 6 pesan, role yang diizinkan, dan panjang konten maksimal 1.500 karakter.
- `POST /api/assistant` diberi batas waktu respons 45 detik dan response `504 ASSISTANT_TIMEOUT`. Promise timeout ini tidak membatalkan pekerjaan internal yang sudah berjalan.
- `docs/API.md` ditulis ulang agar sesuai dengan route aktual, contoh payload AIRA, akses, status HTTP, dan status Full CRUD.
- `docs/BACKEND_TECHNICAL.md` diperbarui agar menyebut ZIP terbaru dan nama checklist UAT yang benar.
- Ditambahkan Route Handler GET/PATCH/DELETE untuk detail rumah tangga; DELETE menolak jika masih ada anggota, asesmen, atau interaksi Assistant terkait.
- Ditambahkan PATCH/DELETE pada detail asesmen; PATCH hanya mengubah catatan, sedangkan DELETE menolak jika masih ada rekomendasi atau interaksi Assistant terkait.
- Ditambahkan GET/PATCH/DELETE kontribusi milik pengguna; update hanya untuk status `needs_revision`, pembatalan hanya untuk `pending` tanpa histori review.
- Perbaikan pengiriman ulang kontribusi pada Server Action: kontribusi `needs_revision` kini memperbarui record yang sama, bukan membuat duplikat; status kembali ke `pending`.
- Pagination GET kontribusi dipindahkan ke query Supabase (`range`) dan jumlah total memakai exact count.
- UI riwayat kalkulator dan kontribusi diberi aksi hapus/batalkan yang memakai endpoint baru tanpa mengubah struktur visual halaman.
- Endpoint perubahan status pengguna admin diseragamkan memakai helper autentikasi dan response API bersama.
- Ditambahkan `docs/DB_SCHEMA_AUDIT.md` dan `docs/aira-core-erd.dbml` berdasarkan export schema SQL pengguna.

## Inventaris Route Handler

| Domain | Operasi yang tersedia |
|---|---|
| Assistant | POST `/api/assistant` |
| Water Navigation | GET `/api/water-navigation`; GET `/api/water-navigation/{id}` |
| Contributions | GET, POST `/api/contributions`; GET, PATCH, DELETE `/api/contributions/{id}` |
| Admin Contributions | GET `/api/admin/contributions`; GET, PATCH `/api/admin/contributions/{id}` |
| Households | GET, POST `/api/households`; GET, PATCH, DELETE `/api/households/{id}` |
| Water Assessments | GET, POST `/api/water-assessments`; GET, PATCH, DELETE `/api/water-assessments/{id}` |
| Admin Users | GET `/api/admin/users`; GET `/api/admin/users/{id}`; PATCH `/api/admin/users/{id}/status`; GET `/api/admin/users/stats` |
| Admin Activity | GET `/api/admin/activity-logs` |
| Profile | GET `/api/profile` |

Dalam source code yang diperiksa, belum ada Route Handler `PUT` atau `DELETE`.

## Evaluasi kriteria penilaian backend

| Kriteria | Kondisi | Catatan |
|---|---|---|
| Backend dalam project Next.js | Terpenuhi | Route Handlers dan Server Actions tersedia. |
| Pemisahan logic | Sebagian besar terpenuhi | Struktur service/lib sudah ada; beberapa action masih memuat orkestrasi database. |
| Error handling konsisten | Sebagian | Helper response tersedia; sejumlah Server Action masih mengembalikan bentuk error sendiri. |
| ERD/schema database | Sebagian terpenuhi | Ditambahkan DBML dan audit relasi berdasarkan schema export; RLS, trigger, RPC, grants, dan migration belum disertakan. |
| Dokumentasi API | Ditingkatkan | OpenAPI dan API.md dilengkapi; perlu validasi langsung di Swagger UI setelah deploy. |
| Validasi input | Sebagian besar | Validasi kontribusi, kalkulator, dan Assistant ada; audit menyeluruh semua route masih diperlukan. |
| Autentikasi dan dua role | Tersedia di source | RLS dan policy database belum dapat diverifikasi tanpa export SQL. |
| Proteksi mutasi | Sebagian | Endpoint mutasi yang ada dilindungi; seluruh Server Action perlu ditinjau konsistensinya. |
| Rate limiting AI | Belum tersedia | Timeout bukan pengganti rate limiting. Perlu limiter persisten yang kompatibel dengan Vercel. |
| Minimal 3 Full CRUD | Tersedia pada level Route Handler | `households`, `water_assessments`, dan `water_point_contributions` memiliki Create, Read, Update, Delete dengan batasan integritas relasi; tetap perlu UAT terhadap RLS Supabase. |
| End-to-end | Sebagian | Alur UI/service/API ada; tetap perlu UAT dengan Supabase dan Vercel Preview yang aktif. |

## Status tiga kandidat Full CRUD

| Resource | Create | Read | Update | Delete |
|---|---|---|---|---|
| `households` | POST `/api/households` | GET daftar dan GET detail | POST upsert profil dan PATCH detail | DELETE jika tidak ada data turunan |
| `water_assessments` | POST `/api/water-assessments` | GET daftar dan GET detail | PATCH catatan asesmen (snapshot kalkulasi tetap immutable) | DELETE jika tidak ada rekomendasi/interaksi terkait |
| `water_point_contributions` | POST `/api/contributions` | GET daftar dan GET detail | PATCH kontribusi `needs_revision`; Server Action pengiriman ulang memperbarui record yang sama | DELETE/batalkan hanya untuk `pending` tanpa histori review |

**Catatan makna CRUD:** asesmen tidak mengizinkan pengguna mengubah hasil perhitungan historis. Operasi Update dibatasi pada `assessment_notes` agar integritas hasil kalkulasi tetap terjaga. Kontribusi tidak dapat dihapus setelah ada histori review. Rumah tangga dan asesmen yang memiliki data turunan ditolak penghapusannya dengan HTTP 409; ini disengaja karena schema yang diberikan tidak menunjukkan `ON DELETE CASCADE`.

## Temuan yang perlu diperiksa lebih lanjut

1. **Rate limiting Assistant:** belum ada limiter persisten. Jangan mengandalkan in-memory map pada Vercel serverless.
2. **Helper otorisasi:** `authorization.js` dan `requireAdmin.js` merupakan dua jalur pemeriksaan. Standarisasi agar semua admin action memiliki aturan yang sama.
3. **Audit log admin:** verifikasi apakah setiap perubahan status akun, review kontribusi, dan edit titik air benar-benar menulis `admin_activity_logs`, bukan hanya log console.
4. **Pagination kontribusi:** GET `/api/contributions` kini menggunakan pagination query Supabase dan exact count.
5. **Swagger UI:** gunakan login pada origin yang sama untuk mencoba endpoint privat; jangan menaruh access token atau service-role key di dokumentasi.
6. **RLS dan SQL:** belum dapat dinyatakan aman/benar hanya dari source code Next.js.

## File database yang masih diperlukan untuk verifikasi RLS dan production

Schema export telah diberikan dan DBML dibuat. Untuk memastikan keamanan, masih diperlukan export RLS policies, trigger, grants, dan definisi function/RPC dari Supabase untuk:
`users`, `households`, `water_points`, `water_point_contributions`, `contribution_reviews`, `water_assessments`, `assessment_recommendations`, `assistant_interactions`, `admin_activity_logs`, `provinces`, `city_regencies`, `districts`, `document_registry`, `document_chunks`.

Sertakan definisi function/RPC:
`is_aira_admin`, `review_water_point_contribution`, `match_document_chunks`.

Sertakan RLS policies, trigger, foreign key, CHECK constraint, unique constraint, dan ON DELETE behavior. Jangan sertakan `.env`, service-role key, access token, atau data pribadi.

## Pemeriksaan yang belum dijalankan

Pemeriksaan statis pada file ZIP bukan pengganti build/test. Sebelum menyatakan paket siap UAT, jalankan:

```bash
npm ci
npm test
npm run lint
npm run build
```

Lanjutkan dengan UAT:
1. Login user dan admin.
2. Coba akses endpoint privat tanpa login.
3. Pastikan user tidak dapat membaca/mengubah data user lain.
4. Pastikan user tidak dapat mengakses endpoint admin.
5. Kirim kontribusi baru dan pastikan belum muncul di Navigasi Air.
6. Minta revisi, kirim ulang, dan verifikasi jejak kontribusi lama/baru.
7. Setujui kontribusi sebagai admin dan cek titik air publik.
8. Jalankan kalkulator sebagai tamu dan user login.
9. Uji wilayah tanpa data curah hujan.
10. Uji Assistant dengan pertanyaan valid, kosong, terlalu panjang, riwayat invalid, dan layanan AI tidak tersedia.
