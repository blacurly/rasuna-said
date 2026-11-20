# AIRA Backend API

Base URL lokal: `http://localhost:3000`

Semua request dan response API menggunakan JSON, kecuali jika disebutkan lain.

## Format respons

Sukses:

```json
{
  "success": true,
  "message": "Permintaan berhasil.",
  "data": {}
}
```

Gagal:

```json
{
  "success": false,
  "message": "Data tidak valid.",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": null
  }
}
```

Kode HTTP utama:
- `200`: berhasil membaca, menghitung, atau memperbarui data.
- `201`: resource baru berhasil dibuat atau hasil kalkulasi berhasil disimpan.
- `400`: JSON atau parameter request tidak valid.
- `401`: belum login atau sesi tidak valid.
- `403`: tidak memiliki hak akses.
- `404`: resource tidak ditemukan atau bukan milik pengguna.
- `422`: input tidak lolos validasi.
- `502`: layanan AI/retrieval gagal.
- `503`: layanan atau pemeriksaan otorisasi sementara tidak tersedia.
- `504`: batas waktu permintaan Assistant tercapai.

Pagination menggunakan `limit` dan `offset` pada endpoint yang mendukungnya.

Catatan kompatibilitas: beberapa endpoint admin lama (`/api/admin/users`, `/api/admin/activity-logs`, dan `/api/admin/users/{id}/status`) masih menggunakan format respons `NextResponse.json` langsung. Pada daftar pengguna dan activity logs, `data` serta `pagination` berada pada level teratas dan format error belum seluruhnya memakai properti `error.code`. Ini dicatat sebagai pekerjaan standardisasi berikutnya; Swagger menjelaskan bentuk respons yang benar-benar dikirim route saat ini.

## Autentikasi dan otorisasi

Endpoint publik:
- `POST /api/assistant`
- `GET /api/water-navigation`
- `GET /api/water-navigation/{id}`
- `POST /api/water-assessments` (perhitungan tamu diperbolehkan)

Endpoint yang memerlukan sesi Supabase:
- `GET /api/profile`
- `GET`, `POST /api/households`
- `GET /api/water-assessments`
- `GET /api/water-assessments/{id}`
- `GET`, `POST /api/contributions`

Endpoint admin:
- `GET /api/admin/contributions`
- `GET`, `PATCH /api/admin/contributions/{id}`
- `GET /api/admin/users`
- `GET /api/admin/users/{id}`
- `PATCH /api/admin/users/{id}/status`
- `GET /api/admin/users/stats`
- `GET /api/admin/activity-logs`

Identitas pengguna diambil dari `supabase.auth.getUser()` pada server. Jangan mempercayai `user_id`, `owner_user_id`, `assessed_by_user_id`, `contributor_user_id`, atau role yang dikirim klien.

## Daftar endpoint yang tersedia

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/assistant` | Publik | Mengirim pertanyaan ke Assistant berbasis retrieval dokumen dan Gemini. |
| GET | `/api/water-navigation` | Publik | Daftar titik air aktif, terverifikasi, dan bukan simulasi. |
| GET | `/api/water-navigation/{id}` | Publik | Detail titik air publik. |
| POST | `/api/water-assessments` | Publik; simpan jika login | Menghitung ketahanan air; riwayat tersimpan jika sesi pengguna tersedia dan penyimpanan berhasil. |
| GET | `/api/water-assessments` | Login | Riwayat asesmen milik pengguna. |
| GET | `/api/water-assessments/{id}` | Login | Detail asesmen milik pengguna. |
| GET | `/api/households` | Login | Mengambil data rumah tangga terbaru milik pengguna. |
| POST | `/api/households` | Login | Membuat profil rumah tangga pertama atau memperbarui profil terbaru. |
| GET | `/api/contributions` | Login | Riwayat kontribusi milik pengguna. |
| POST | `/api/contributions` | Login | Mengirim usulan titik air; tidak langsung memublikasikan titik. |
| GET | `/api/admin/contributions` | Admin | Daftar antrean kontribusi. |
| GET | `/api/admin/contributions/{id}` | Admin | Detail kontribusi. |
| PATCH | `/api/admin/contributions/{id}` | Admin | Menyetujui, menolak, atau meminta revisi. |
| GET | `/api/admin/users` | Admin | Daftar pengguna. |
| GET | `/api/admin/users/{id}` | Admin | Detail pengguna. |
| PATCH | `/api/admin/users/{id}/status` | Admin | Mengubah status akun pengguna. |
| GET | `/api/admin/users/stats` | Admin | Statistik pengguna. |
| GET | `/api/admin/activity-logs` | Admin | Riwayat aktivitas admin. |
| GET | `/api/profile` | Login | Profil akun aktif. |

## Contoh request

### 1. AIRA Assistant

`POST /api/assistant`

```json
{
  "question": "Bagaimana cara menghemat air saat musim kemarau?",
  "history": [
    {
      "role": "user",
      "content": "Apa yang dimaksud dengan ketahanan air rumah tangga?"
    }
  ]
}
```

Ketentuan:
- `question` wajib berupa teks 1–2.000 karakter.
- `history` opsional, maksimal 6 pesan.
- Setiap pesan hanya boleh memiliki role `user` atau `assistant`.
- `content` wajib berupa teks maksimal 1.500 karakter.
- Response `data` berisi `answer`, `mode`, `sources`, dan `historySaved`.
- `historySaved` bernilai true hanya jika percakapan berhasil disimpan untuk pengguna yang login.
- Timeout request API: 45 detik. Timeout HTTP tidak menjamin proses internal yang sudah berjalan otomatis dibatalkan.
- Belum ada rate limiter persisten yang terpasang pada route ini. Rate limiting produksi masih menjadi pekerjaan wajib sebelum endpoint dibuka ke publik luas.

Contoh response:

```json
{
  "success": true,
  "message": "Jawaban AIRA Assistant berhasil dibuat.",
  "data": {
    "answer": "Gunakan air sesuai kebutuhan, periksa kebocoran, dan simpan air dalam wadah tertutup.",
    "mode": "rag",
    "sources": [
      {
        "title": "Panduan Penghematan Air Rumah Tangga",
        "publisher": "Dokumen referensi AIRA",
        "page_start": 4,
        "page_end": 5
      }
    ],
    "historySaved": false
  }
}
```

### 2. Kalkulator Ketahanan Air

`POST /api/water-assessments`

```json
{
  "lokasi": "Rongkop, Gunungkidul",
  "anggota": 4,
  "sumberAir": "Sumur Gali/Bor",
  "kondisi": "Terbatas",
  "kapasitas": 1200,
  "persen": 50,
  "mhm": true,
  "anggotaMhm": 2,
  "luasAtap": 60
}
```

Ketentuan:
- `anggota`: bilangan bulat 1–30.
- `kapasitas`: lebih dari 0 dan maksimal 100.000 liter.
- `persen`: 0–100.
- `luasAtap`: opsional, 0–1.000 m².
- Sumber dan kondisi air harus sesuai pilihan yang didukung kalkulator.
- Pengguna tamu tetap dapat menghitung, tetapi tidak memiliki riwayat tersimpan.
- Jika wilayah tidak memiliki data curah hujan, estimasi panen hujan tidak ditampilkan sebagai angka dari wilayah lain.

### 3. Profil Rumah Tangga

`POST /api/households`

```json
{
  "namaRumahTangga": "Keluarga Sejahtera",
  "wilayahDesa": "Desa Semugih, Rongkop",
  "anggota": 4,
  "mhm": true,
  "anggotaMhm": 2,
  "sumberAir": "Sumur Gali/Bor",
  "kapasitas": 1200
}
```

Operasi POST saat ini bersifat create-or-update: jika pengguna belum memiliki profil, record dibuat; jika sudah ada, profil terbaru miliknya diperbarui. Endpoint terpisah untuk PUT/PATCH/DELETE belum tersedia.

### 4. Kontribusi Titik Air

`POST /api/contributions`

```json
{
  "contribution_type": "new_point",
  "proposed_point_name": "Sumur Komunal RT 04",
  "proposed_water_source_type": "public_well",
  "proposed_province_id": 34,
  "proposed_city_regency_id": 3403,
  "proposed_district_id": 340312,
  "proposed_village": "Semugih",
  "proposed_address_detail": "RT 04/RW 02",
  "proposed_latitude": -8.045,
  "proposed_longitude": 110.735,
  "proposed_availability_status": "available",
  "proposed_access_information": "Pengelola: Kelompok Air RT 04",
  "proposed_opening_hours": "06.00-18.00",
  "evidence_url": "https://maps.google.com/?q=-8.045,110.735",
  "notes": "Saya melihat langsung."
}
```

Jenis `contribution_type` yang didukung: `new_point` dan `update_point`. Untuk `update_point`, sertakan `water_point_id`.

Kontribusi merupakan usulan. Data baru tidak boleh langsung muncul sebagai titik air publik. Admin memutuskan `approved`, `rejected`, atau `needs_revision` melalui endpoint review.

### 5. Review kontribusi oleh admin

`PATCH /api/admin/contributions/{id}`

```json
{
  "reviewStatus": "needs_revision",
  "reviewNotes": "Mohon lengkapi jam akses dan nama pengelola."
}
```

Untuk keputusan `approved`, `availabilityStatus` wajib diisi dengan salah satu nilai: `available`, `limited`, `unavailable`, atau `unknown`.

## Status Full CRUD saat ini

Kriteria Full CRUD berarti tersedia operasi Create, Read, Update, dan Delete yang benar-benar bekerja pada resource terkait. Kondisi route saat ini:

| Resource | Create | Read | Update | Delete | Status |
|---|---|---|---|---|---|
| `households` | POST | GET | POST melakukan update profil terbaru | Belum tersedia | Belum Full CRUD |
| `water_assessments` | POST (jika tersimpan) | GET daftar dan detail | Belum tersedia | Belum tersedia | Belum Full CRUD |
| `water_point_contributions` | POST | GET riwayat | Pengiriman ulang kontribusi revisi membuat usulan baru yang merujuk kontribusi lama melalui catatan; belum ada PATCH resource pengguna | Belum tersedia | Belum Full CRUD |

**Penting:** endpoint DELETE belum ditambahkan hanya untuk memenuhi hitungan CRUD. Penghapusan rumah tangga dapat berdampak pada relasi asesmen; penghapusan asesmen dapat berdampak pada rekomendasi; penghapusan kontribusi dapat merusak jejak review. Implementasi final harus didasarkan pada foreign key, cascade behavior, RLS, dan aturan retensi dari schema SQL Supabase yang sebenarnya. Pilihan yang lebih aman mungkin berupa soft delete atau pembatalan dengan status khusus, tetapi perlu disepakati bersama schema dan kebutuhan produk.

## Catatan keamanan dan pekerjaan lanjutan

- Verifikasi RLS untuk semua tabel dan operasi mutasi dari Supabase SQL Editor.
- Tambahkan rate limiting persisten untuk `POST /api/assistant` (berdasarkan user ID untuk pengguna login dan identitas jaringan yang sesuai untuk tamu). Jangan mengandalkan in-memory limiter pada Vercel serverless.
- Samakan helper autentikasi untuk Route Handler dan Server Action agar aturan role/status akun tidak berbeda.
- Tambahkan operasi CRUD yang belum ada setelah schema dan foreign key diverifikasi.
- Jalankan UAT dengan akun user dan admin terpisah.

## Endpoint CRUD tambahan (hasil penyelarasan)

### Rumah tangga

| Method | Endpoint | Keterangan | Status penting |
|---|---|---|---|
| GET | `/api/households/{id}` | Detail rumah tangga milik user | 200, 401, 404 |
| PATCH | `/api/households/{id}` | Memperbarui data rumah tangga milik user | 200, 400, 401, 404, 422 |
| DELETE | `/api/households/{id}` | Menghapus rumah tangga hanya jika tidak memiliki anggota, asesmen, atau interaksi Assistant | 200, 401, 404, 409 |

`POST /api/households` tetap digunakan oleh formulir Dashboard untuk membuat profil pertama atau memperbarui profil terbaru. `PATCH /api/households/{id}` tersedia untuk operasi resource spesifik.

### Riwayat asesmen

| Method | Endpoint | Keterangan | Status penting |
|---|---|---|---|
| GET | `/api/water-assessments/{id}` | Detail asesmen milik user | 200, 400, 401, 404 |
| PATCH | `/api/water-assessments/{id}` | Memperbarui `assessment_notes` tanpa mengubah snapshot hasil kalkulasi | 200, 400, 401, 404, 422 |
| DELETE | `/api/water-assessments/{id}` | Menghapus asesmen jika belum memiliki rekomendasi/interaksi terkait | 200, 400, 401, 404, 409 |

### Kontribusi titik air

| Method | Endpoint | Keterangan | Status penting |
|---|---|---|---|
| GET | `/api/contributions/{id}` | Detail kontribusi milik user | 200, 400, 401, 404 |
| PATCH | `/api/contributions/{id}` | Memperbarui kontribusi berstatus `needs_revision`, lalu mengembalikannya ke `pending` | 200, 400, 401, 404, 409, 422 |
| DELETE | `/api/contributions/{id}` | Membatalkan kontribusi `pending` yang belum memiliki riwayat review | 200, 400, 401, 404, 409 |

Semua endpoint di atas memeriksa sesi login dan kepemilikan data di server. Status verifikasi tidak dapat diubah oleh pengguna melalui endpoint kontribusi. Penghapusan yang dapat memutus relasi historis ditolak dengan HTTP 409.

OpenAPI JSON tersedia pada `/api/openapi` dan Swagger UI pada `/api-docs`.

## Admin — CRUD Kelola Titik Air (V3 patch)

Semua endpoint berikut memerlukan sesi login Supabase dan role admin aktif yang diverifikasi server:

- `GET /api/admin/water-points`: daftar titik air; filter `q`, `verificationStatus`, `availabilityStatus`, `isActive`, `limit`, `offset`.
- `POST /api/admin/water-points`: menambah titik air secara langsung. Backend mengatur `verification_status=verified`, identitas verifier, dan nilai default aktivasi/simulasi.
- `GET /api/admin/water-points/{id}`: detail titik air.
- `PATCH /api/admin/water-points/{id}`: memperbarui field yang tervalidasi.
- `DELETE /api/admin/water-points/{id}`: soft delete/penonaktifan (`is_active=false`); data tidak dihapus permanen.

Sumber air yang didukung: `public_well`, `spring`, `storage_tank`, `emergency_tank`, `hydrant`, `reservoir`, `water_station`, `other`. Status ketersediaan: `available`, `limited`, `unavailable`, `unknown`.
