# AIRA — Audit Skema Database

Dokumen ini disusun dari export definisi tabel yang diberikan pada 20 November 2026. Export tersebut memuat `CREATE TABLE`, primary key, foreign key, dan sebagian CHECK constraint. Export **tidak** memuat definisi RLS policies, trigger, function/RPC, grants, maupun konfigurasi extension.

## Temuan relasi yang memengaruhi CRUD

| Resource | Relasi yang terlihat | Dampak terhadap DELETE |
|---|---|---|
| `households` | `household_members`, `water_assessments`, `assistant_interactions` | Jangan menghapus rumah tangga jika masih memiliki data turunan. Endpoint DELETE mengembalikan HTTP 409 jika dependensi masih ada. |
| `water_assessments` | `assessment_recommendations`, `assistant_interactions` | Jangan menghapus asesmen jika rekomendasi atau interaksi Assistant masih terhubung. Endpoint DELETE mengembalikan HTTP 409. |
| `water_point_contributions` | `contribution_reviews`, `water_point_contribution_reviews` | Pembatalan hanya diizinkan saat status `pending` dan belum ada riwayat review. |
| `water_points` | `water_point_contributions` | Hard delete titik air yang dipilih admin harus mempertahankan histori kontribusi: `water_point_contributions.water_point_id` menjadi NULL dengan FK `ON DELETE SET NULL`; `contribution_reviews` tetap melekat pada contribution. Jangan cascade menghapus kontribusi/review. |

## Batasan yang harus diverifikasi di Supabase

1. Pastikan RLS aktif pada tabel yang berisi data pengguna.
2. Pastikan pengguna hanya dapat SELECT/INSERT/UPDATE data yang `owner_user_id`, `assessed_by_user_id`, atau `contributor_user_id`-nya sama dengan `auth.uid()`.
3. Pastikan hanya admin aktif yang dapat memproses review, mengelola `water_points`, mengelola pengguna, dan membaca `admin_activity_logs`.
4. Pastikan `water_point_contributions` tidak dapat langsung mengubah `status` menjadi `approved` oleh user biasa.
5. Periksa function `is_aira_admin`, `review_water_point_contribution`, dan `match_document_chunks` langsung dari SQL Editor/migrations.
6. Periksa apakah ada trigger `updated_at` dan sinkronisasi profil `public.users` dengan `auth.users`.

## Catatan integritas skema

- `users` memiliki dua foreign key yang menunjuk `auth.users(id)` untuk kolom yang sama (`users_user_id_fkey` dan `users_user_id_auth_fkey`). Periksa apakah duplikasi ini memang disengaja sebelum menghapus salah satunya.
- `admin_activity_logs.target_user_id` wajib diisi dan tidak memiliki FK yang ditampilkan pada export. Log aktivitas admin yang tidak menargetkan pengguna tidak dapat disimpan ke tabel ini tanpa penyesuaian skema.
- `water_point_contributions` memiliki dua tabel review (`contribution_reviews` dan `water_point_contribution_reviews`). Tentukan satu sumber histori yang menjadi standar, atau dokumentasikan peran masing-masing. Jangan menghapus salah satunya tanpa audit data dan kode.
- `household_members` tidak memiliki `ON DELETE CASCADE`; penghapusan rumah tangga harus memeriksa data anggota terlebih dahulu.
- Foreign key ke asesmen, rekomendasi, dan interaksi juga tidak menampilkan cascade. Penghapusan parent harus ditolak bila masih ada child record.

## Status

File ini adalah audit dokumentasi, bukan migration yang dieksekusi. Tidak ada perubahan langsung pada database Supabase. Penerapan perubahan kebijakan RLS harus menunggu export policies/functions aktual agar tidak menimpa aturan keamanan yang sudah berjalan.

## Current review history and assessment delete

Review history is stored in `water_point_contribution_reviews` (the legacy `contribution_reviews` table is not the active table). Assessment deletion is handled by the ownership-checked database function `delete_my_water_assessment`; it deletes direct assessment recommendations and Assistant interaction rows in the same transaction. Admin water-point removal uses soft deactivation (`is_active=false`). Verify these assumptions against the live schema before applying `database/AIRA_BACKEND_ALIGNMENT.sql`.
