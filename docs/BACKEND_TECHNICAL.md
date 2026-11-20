# AIRA — Dokumentasi Teknis Backend

Versi audit: 20 November 2026  
Basis: `aira-website` dan schema export SQL.

> Dokumen ini menjelaskan implementasi yang terlihat di repository dan relasi tabel dari schema export. RLS policies, grants, trigger, dan source function PostgreSQL belum disertakan dalam export sehingga belum dapat diverifikasi.

## 1. Arsitektur

- **Web dan backend:** Next.js App Router dengan JavaScript.
- **Backend request:** Route Handlers di `app/api/**/route.js` dan Server Actions di `app/actions/*.js`.
- **Database dan autentikasi:** Supabase PostgreSQL dan Supabase Auth.
- **AI:** Gemini API melalui `services/assistantService.js` dan `services/aiService.js`.
- **RAG:** `document_registry`, `document_chunks`, dan RPC `match_document_chunks` digunakan oleh Assistant. Pipeline ingestion berada di `pipeline/ingest.py`.
- **Deployment yang direncanakan:** GitHub → Vercel (Next.js + API) → Supabase/Gemini melalui environment variables.

## 2. Pola autentikasi dan otorisasi

1. Server mengambil identitas melalui `supabase.auth.getUser()`; jangan mempercayai `user_id`, `contributor_user_id`, atau role dari request body.
2. `lib/auth/authorization.js` menyediakan `requireApiUser()` dan `requireApiAdmin()`.
3. `lib/auth/requireAdmin.js` memeriksa sesi, profil `users`, `role = admin`, `account_status = active`.
4. Admin juga diperiksa melalui RPC `is_aira_admin` di beberapa service.
5. Server Action harus memeriksa sesi/role sendiri atau menggunakan helper server-side yang sama; menyembunyikan tombol di UI bukan pengamanan.

## 3. Tabel dan fungsi database yang dipanggil source code

Nama berikut berasal dari query repository; kolom yang disebut merupakan kolom yang diminta oleh source code, bukan pengganti schema dump Supabase.

| Tabel / RPC | Kegunaan yang terlihat di kode |
|---|---|
| `users` | Profil, nama, email, nomor telepon, role, status akun |
| `households` | Data keluarga dan wilayah pemilik |
| `water_points` | Direktori titik air yang ditampilkan ke publik setelah verified, active, non-simulation |
| `water_point_contributions` | Usulan titik air dari pengguna |
| `contribution_reviews` | Riwayat keputusan admin atas kontribusi |
| `water_assessments` | Hasil kalkulator/asesmen |
| `assessment_recommendations` | Rekomendasi yang terkait dengan asesmen |
| `assistant_interactions` | Riwayat pertanyaan dan jawaban Assistant untuk pengguna login |
| `admin_activity_logs` | Riwayat aktivitas admin |
| `provinces`, `city_regencies`, `districts` | Referensi wilayah administratif |
| `document_registry` | Metadata dokumen sumber RAG |
| `document_chunks` | Potongan dokumen dan embedding |
| `is_aira_admin()` | Pemeriksaan role admin di database |
| `review_water_point_contribution(...)` | Proses review kontribusi dan pembaruan status melalui RPC |
| `match_document_chunks(...)` | Semantic retrieval chunk RAG |

### Database yang masih perlu diverifikasi

- Definisi RLS policies, grants, trigger, function/RPC, dan ON DELETE behavior aktual. Schema tabel/foreign key tersedia pada `docs/DB_SCHEMA_AUDIT.md` dan ERD `docs/aira-core-erd.dbml`.
- SQL body dan signature aktual `review_water_point_contribution`, `is_aira_admin`, serta `match_document_chunks`.
- Kebijakan RLS untuk seluruh tabel di atas, termasuk anon, authenticated user, dan admin.
- Apakah `water_point_contributions` sudah memiliki kolom terpisah untuk nama pengelola, nomor HP, dan Google Maps URL. Form saat ini menyimpan informasi pengelola di `proposed_access_information` dan link Maps di `evidence_url`.
- Apakah `admin_activity_logs.action_type` memiliki CHECK constraint atau enum yang membatasi nilai.

## 4. Peta service

| Service | Tanggung jawab |
|---|---|
| `services/contributionService.js` | Pengiriman kontribusi, riwayat pengguna, daftar admin, review kontribusi |
| `services/adminTitikAirService.js` | Mengambil dan memetakan titik air terverifikasi untuk admin |
| `app/actions/admin-titik-air.js` | Server Action admin untuk memperbarui data operasional titik air terverifikasi |
| `services/curahHujanService.js` | Geocoding dan rata-rata curah hujan historis Open-Meteo |
| `services/calculatorService.js` | Perhitungan kebutuhan dan potensi panen hujan secara deterministik |
| `services/rekomendasiService.js` | Rule engine rekomendasi dan pemilihan tambahan dengan AI |
| `services/assistantService.js` | Retrieval dokumen dan generasi jawaban Assistant |
| `services/aiService.js` | Penjelasan/seleksi rekomendasi AI |
| `services/adminActivityLogService.js` | Membaca audit log admin |

## 5. RAG dan ingestion

1. Dokumen terdaftar di `document_registry`.
2. `pipeline/ingest.py` mengambil dokumen, mengekstrak teks/OCR, melakukan chunking, membuat embedding Gemini, lalu menyimpan chunk ke Supabase.
3. Assistant membuat embedding query dan memanggil `match_document_chunks`.
4. Pencarian dokumen spesifik dapat menggunakan `document_registry` dan `document_chunks`.
5. Gemini menyusun jawaban berdasarkan konteks yang tersedia; bila retrieval untuk rujukan resmi gagal, Assistant harus menyatakan sumber tidak dapat diverifikasi.

Jangan mengubah dimensi embedding, nama model, struktur tabel, atau RPC tanpa menyelaraskan ingestion dan retrieval. Source code mengharapkan dimensi embedding default 768.

## 6. Environment variables

Nama variabel yang direferensikan source code:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` atau `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server/pipeline saja; jangan pernah diekspos ke browser)
- `GEMINI_API_KEY`
- `GEMINI_EMBEDDING_MODEL`
- `EMBEDDING_DIMENSION`
- `GEMINI_ASSISTANT_MODELS` atau `GEMINI_MODELS`
- `GEMINI_MODEL_TIMEOUT_MS`
- `TOP_K`
- `EXACT_DOCUMENT_CHUNKS`
- `SIMILARITY_THRESHOLD`
- `SUPABASE_TABLE_KATALOG`
- `NEXT_PUBLIC_SITE_URL`

Nilai rahasia tidak boleh dimasukkan ke repository, dokumentasi, screenshot, atau laporan UAT. Atur variabel di environment lokal/Vercel sesuai kebutuhan deployment.

## 7. Build, test, dan deployment

```bash
npm ci
npm test
npm run lint
npm run build
npm run dev
```

Sebelum UAT di Vercel Preview:

1. Pastikan environment variables Preview telah diatur.
2. Pastikan Supabase URL/key menunjuk ke project yang benar.
3. Pastikan RPC dan tabel yang dipakai sudah tersedia.
4. Uji user dan admin dengan akun terpisah.
5. Jangan menggunakan data simulasi sebagai titik air terverifikasi.
6. Jalankan checklist `docs/UAT_CHECKLIST.md`.

## 8. Batas dokumentasi

Dokumentasi RLS final harus dibuat dari SQL/policy aktual Supabase, bukan menebak berdasarkan query aplikasi. Dokumentasi database final membutuhkan schema export tanpa data pengguna dan tanpa secret.

## Admin Water Point CRUD

Patch menambahkan Route Handlers `app/api/admin/water-points` dan `app/api/admin/water-points/[id]`, dengan service `services/waterPointAdminService.js`. Setiap operasi memverifikasi role admin aktif melalui `requireApiAdmin`. Payload tervalidasi; identitas verifier berasal dari sesi server. DELETE adalah soft-delete dengan `is_active=false` untuk menjaga relasi kontribusi dan riwayat. Public routes `/api/water-navigation` tetap terpisah dan hanya melayani direktori publik sesuai aturan yang sudah ada.
