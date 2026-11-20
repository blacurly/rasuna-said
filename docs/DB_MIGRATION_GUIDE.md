# Panduan migrasi database AIRA

## Sebelum menjalankan SQL
1. Buat backup database Supabase atau pastikan project memiliki backup point yang dapat dipulihkan.
2. Jalankan preflight query di bawah untuk memastikan tabel/kolom yang dipakai migration tersedia.
3. Jalankan file `database/AIRA_BACKEND_ALIGNMENT.sql` pada SQL Editor.
4. Jalankan verification query setelah migrasi.

## Preflight
```sql
select to_regclass('public.water_assessments') as assessments,
       to_regclass('public.assessment_recommendations') as recommendations,
       to_regclass('public.assistant_interactions') as assistant_interactions,
       to_regclass('public.water_point_contributions') as contributions;

select table_name, column_name
from information_schema.columns
where table_schema='public'
  and table_name in ('water_assessments','assessment_recommendations','assistant_interactions','water_point_contributions')
order by table_name, ordinal_position;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='review_water_point_contribution';
```

## Apa yang dilakukan migration
- Membuat `delete_my_water_assessment(bigint)`; fungsi ini hanya menghapus assessment milik pengguna login, bersama `assessment_recommendations` dan `assistant_interactions` yang langsung terhubung ke assessment tersebut. Penghapusan terjadi dalam satu transaksi.
- Menambahkan overload 4-argumen `review_water_point_contribution` untuk menerima status ketersediaan final yang dipilih admin. Wrapper memanggil RPC review 3-argumen yang sudah ada.
- Tidak menghapus household, tidak menghapus user, tidak menghapus guide, dan tidak menghapus titik air.

## Verification
```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('delete_my_water_assessment','review_water_point_contribution');
```

## Catatan penting
- Migration ini mengasumsikan `assistant_interactions.user_id`, `water_assessments.assessed_by_user_id`, `assessment_recommendations.assessment_id`, `water_point_contributions.proposed_availability_status`, dan `public.is_aira_admin()` ada sesuai aplikasi saat ini.
- Jalankan preflight sebelum migration. Jika struktur actual berbeda, jangan menjalankan SQL sampai mismatch diperbaiki.
- Review wrapper mengandalkan RPC 3-argumen yang telah diperbaiki sebelumnya; jangan menghapus fungsi 3-argumen.
- Nonaktifkan titik air Admin dilakukan melalui `is_active=false` pada aplikasi, bukan hard delete.
