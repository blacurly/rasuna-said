# Admin CRUD Kelola Titik Air

## File patch
Salin file/folder dalam ZIP patch ke root repository `aira-website`, merge folder dan overwrite `app/api/openapi/route.js` serta dokumentasi yang ditandai.

## Routes
- `GET, POST /api/admin/water-points`
- `GET, PATCH, DELETE /api/admin/water-points/{id}`

## Authorization
Route/service menggunakan `requireApiAdmin()` yang memeriksa sesi, role admin, status aktif, dan RPC `is_aira_admin`. Jangan bypass atau mengganti pemeriksaan ini.

## DELETE
DELETE melakukan soft-delete (set `is_active=false`) bukan penghapusan permanen.

## Uji setelah menyalin
1. `npm run lint`
2. `npm run build`
3. Login sebagai admin, uji GET, POST, GET detail, PATCH, DELETE pada data uji.
4. Login sebagai user biasa dan coba route; harus ditolak.
5. Pastikan titik yang dinonaktifkan tidak muncul pada daftar publik.
6. Buka `/api/openapi` dan periksa Swagger.

Patch ini dibuat dari ZIP backend improvements V2. Belum dijalankan terhadap database live; periksa lint/build dan lakukan UAT sebelum deployment. Payload POST harus mencakup `point_name`, `water_source_type`, `province_id`, `city_regency_id`, `latitude`, `longitude`; field lain dapat dikirim sesuai kebutuhan.
