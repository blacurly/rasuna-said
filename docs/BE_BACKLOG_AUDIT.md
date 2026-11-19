# Audit Backlog Backend AIRA — 19 November 2026

## Perubahan source yang dilakukan pada audit ini

- BE-01: validasi kontribusi disatukan di service sehingga jalur Server Action dan API memakai validasi payload yang sama; daftar admin diperkaya nama kontributor dari `users.full_name`; data pengelola yang disimpan dalam format lama `proposed_access_information` dipetakan untuk detail admin; endpoint detail dan PATCH review kontribusi ditambahkan karena implementasi sebelumnya hanya memiliki GET daftar.
- BE-03: pencarian lokasi tidak lagi turun otomatis ke kabupaten/provinsi saat lokasi lebih spesifik tidak ditemukan; service mengembalikan status `available`, `unavailable`, atau `error`; pratinjau form membedakan wilayah tidak tersedia dari layanan eksternal yang gagal.
- BE-04: helper normalisasi nomor telepon Indonesia ditambahkan; data nomor tidak valid menjadi `null` sebelum dipakai sebagai tautan `tel:`. Form edit admin kini dapat memperbarui nama pengelola dan nomor telepon pada `water_points`.
- BE-05: Server Action Assistant (jalur yang dipakai chat UI) dan API Assistant memiliki batas total request 45 detik; API mengembalikan HTTP 504 dengan kode `ASSISTANT_TIMEOUT`. Timeout membatasi waktu respons, tetapi belum membatalkan pekerjaan internal yang sudah berjalan.
- BE-06: endpoint spesifikasi `/api/openapi` dan halaman Swagger UI `/api-docs` ditambahkan berdasarkan Route Handlers yang ditemukan.
- BE-07: dokumentasi teknis backend dan checklist UAT ditambahkan.
- Perbaikan minor: duplikasi teks jam operasional di tabel Kelola Titik Air dihapus.

## Belum dapat dinyatakan selesai

1. BE-01: pemisahan kolom `google_maps_url`, `contact_person`, dan `phone_number` pada tabel kontribusi belum dilakukan karena schema SQL aktual tidak ada di ZIP. Untuk sementara source memakai field legacy yang sudah dipanggil aplikasi.
2. BE-01: perilaku RPC `review_water_point_contribution` perlu diverifikasi dari SQL function untuk memastikan seluruh data usulan disalin tanpa perubahan dan transaksi review atomik.
3. BE-02: fitur tambah titik air admin belum dibuat. Halaman Kelola Titik Air sebelumnya juga belum menghubungkan action edit; audit ini sudah menambahkan action update untuk data yang sudah terverifikasi, tetapi belum menambahkan alur create. Tidak aman menebak constraint, kolom wajib, anti-duplikasi, atau nilai `action_type` audit log tanpa schema SQL aktual.
4. BE-04: perlu UAT nomor HP dari row `water_points` yang nyata dan memastikan komponen kontak hanya menampilkan aksi jika nomor valid.
5. BE-05: batas 45 detik membatasi waktu tunggu response HTTP; proses internal yang sudah berjalan tidak dibatalkan oleh Promise.race. Propagasi AbortSignal end-to-end perlu disesuaikan pada seluruh fungsi retrieval/generasi sebelum mengklaim cancellation penuh.
6. BE-06: `/api/admin/stats` belum ada pada repository; yang tersedia adalah `/api/admin/users/stats`. OpenAPI mendokumentasikan endpoint aktual dan tidak membuat endpoint statistik dashboard baru secara fiktif.
7. BE-07: isi kebijakan RLS, SQL function, trigger, dan constraint belum dapat didokumentasikan tanpa export schema/policy Supabase.

## Informasi yang diperlukan untuk menuntaskan bagian database

Minta export schema SQL dari Supabase (tanpa data) untuk tabel:
`users`, `water_points`, `water_point_contributions`, `contribution_reviews`, `admin_activity_logs`, `provinces`, `city_regencies`, `districts`, `households`, `water_assessments`, `assessment_recommendations`, `assistant_interactions`, `document_registry`, `document_chunks`.

Sertakan definisi RPC:
`is_aira_admin`, `review_water_point_contribution`, `match_document_chunks`.

Sertakan juga export RLS policies dan trigger yang terkait. Jangan menyertakan `.env`, service-role key, access token, atau data pribadi pengguna.
