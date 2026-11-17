# AIRA Backend API

Base URL lokal: `http://localhost:3000`

Semua endpoint menggunakan JSON. Endpoint privat membaca sesi Supabase dari cookie browser/server. Jangan mengirim `user_id`, `assessed_by_user_id`, `contributor_user_id`, atau role dari klien sebagai identitas tepercaya; server mengambil identitas dari sesi.

## Format respons

Sukses:
```json
{ "success": true, "message": "Permintaan berhasil.", "data": {} }
```

Gagal:
```json
{ "success": false, "message": "Pesan kesalahan.", "error": { "code": "VALIDATION_ERROR", "details": null } }
```

Pagination menggunakan `limit` dan `offset`.

## Endpoint

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/assistant` | Publik | `question`, opsional `history`; menjalankan layanan AIRA Assistant dan menyimpan riwayat bila sesi login tersedia. |
| POST | `/api/water-assessments` | Publik/perhitungan tamu; penyimpanan jika login | Menjalankan kalkulator dan recommendation system yang sama dengan halaman AIRA. |
| GET | `/api/water-assessments` | Login | Riwayat asesmen milik pengguna aktif. |
| GET | `/api/water-assessments/:id` | Login | Detail asesmen milik pengguna aktif saja. |
| GET | `/api/water-navigation` | Publik | Daftar titik air `verified`, `active`, dan bukan simulasi. |
| GET | `/api/water-navigation/:id` | Publik | Detail titik air yang layak tampil ke publik. |
| POST | `/api/contributions` | Login | Mengirim usulan titik baru atau pembaruan titik; tidak langsung mengubah `water_points`. |
| GET | `/api/contributions` | Login | Riwayat kontribusi milik pengguna aktif. |
| GET | `/api/admin/contributions` | Admin | Antrean kontribusi; opsional filter `status`. |
| PATCH | `/api/admin/contributions/:id` | Admin | Body: `reviewStatus` (`approved`, `rejected`, `needs_revision`) dan opsional `reviewNotes`. Keputusan diproses oleh RPC database yang sudah dipakai service AIRA. |
| GET | `/api/households` | Login | Data rumah tangga terbaru milik pengguna aktif. |
| POST | `/api/households` | Login | Membuat atau memperbarui profil keluarga melalui service dashboard yang sudah digunakan UI. |

### Query navigasi air

`GET /api/water-navigation?q=Rongkop&type=Sumur&province=DI Yogyakarta&regency=Gunungkidul&district=Rongkop&availableOnly=true&limit=50&offset=0`

Semua filter bersifat opsional. `availableOnly=true` hanya menampilkan status `Tersedia` dan `Terbatas`.

### Contoh body

Assistant:
```json
{ "question": "Bagaimana cara menghemat air saat kemarau?", "history": [] }
```

Kalkulator: kirim properti input yang sama dengan formulir kalkulator AIRA (`lokasi`, `anggota`, `sumberAir`, `kondisi`, `kapasitas`, `persen`, `mhm`, `anggotaMhm`, `luasAtap`).

Kontribusi: kirim skema `water_point_contributions` yang digunakan UI, termasuk `contribution_type`, `proposed_point_name`, `proposed_water_source_type`, `proposed_*` wilayah/koordinat, `proposed_availability_status`, `evidence_url`, dan `notes`. Untuk `update_point`, sertakan `water_point_id`.

Profil keluarga: gunakan properti yang dipakai service dashboard: `namaRumahTangga`, `wilayahDesa`, `anggota`, `mhm`, `anggotaMhm`, `sumberAir`, dan `kapasitas`.

## Keamanan dan batasan

- User ID selalu berasal dari `supabase.auth.getUser()` di server.
- Detail asesmen dibatasi dengan `assessed_by_user_id` pemilik.
- Admin diperiksa melalui `users.role`, `account_status`, dan RPC `is_aira_admin`.
- Keputusan kontribusi memakai RPC `review_water_point_contribution`; route tidak menulis langsung ke `water_points`.
- Tidak ada migration SQL baru yang ditambahkan karena ZIP repository tidak menyertakan definisi skema lengkap. Nama kolom dan RPC yang digunakan di API mengikuti implementasi Supabase yang sudah dipanggil oleh aplikasi saat ini.
