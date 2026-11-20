# AIRA — Smart Water Resilience for Every Woman

**AIRA (Access, Intelligence, Resilience, Action)** adalah platform digital yang dirancang untuk membantu perempuan dan keluarga, khususnya di wilayah rawan kekeringan dan keterbatasan akses air bersih, dalam memahami kondisi cadangan air rumah tangga, memperoleh rekomendasi tindakan, serta menemukan informasi titik air alternatif dan panduan sanitasi.

Melalui integrasi teknologi web dan Artificial Intelligence (AI), AIRA menyediakan informasi dan panduan praktis untuk mendukung ketahanan air rumah tangga, termasuk pengelolaan air, sanitasi, dan *Menstrual Hygiene Management* (MHM).

AIRA mengutamakan kemudahan akses informasi. Fitur utama dapat digunakan tanpa login, sementara fitur personal seperti penyimpanan riwayat perhitungan, monitoring, dan pengelolaan data keluarga tersedia melalui akun pengguna.

---

## 🌐 Project Links

| Resource | Link |
|---|---|
| Live Deployment | [AIRA Website](https://aira-for-every-woman.vercel.app) |
| GitHub Repository | |
| Figma Design | |
| Project Presentation | |
| Project Documentation | |

---

## 🚀 Main Features

### 1. Kalkulator Ketahanan Air

Membantu pengguna memperkirakan berapa lama cadangan air rumah tangga dapat memenuhi kebutuhan keluarga berdasarkan jumlah persediaan air, jumlah anggota keluarga, dan kebutuhan air harian.

Fitur ini menyediakan:
- Estimasi ketahanan cadangan air rumah tangga.
- Status kondisi air berdasarkan hasil perhitungan.
- Mode Krisis apabila memenuhi kriteria yang ditentukan.
- Rekomendasi tindakan berdasarkan kondisi air.
- Validasi input untuk menghindari hasil yang tidak dapat ditentukan.

### 2. Navigasi Air

Membantu pengguna menemukan informasi titik air alternatif melalui daftar lokasi yang dilengkapi fitur pencarian, filter, dan halaman detail.

Fitur ini menyediakan:
- Daftar dan pencarian titik air.
- Filter berdasarkan kategori atau informasi yang tersedia.
- Detail informasi dan lokasi titik air.
- Petunjuk arah melalui Google Maps.
- Informasi ketersediaan, jam operasional, status verifikasi, dan waktu pembaruan data.

### 3. AIRA Assistant

Asisten berbasis AI yang membantu pengguna memahami pengelolaan air rumah tangga dan memperoleh panduan praktis terkait sanitasi serta ketahanan air.

AIRA Assistant mendukung:
- Tanya jawab seputar air dan sanitasi.
- Rekomendasi tindakan dalam menghadapi keterbatasan air.
- Panduan kebersihan menstruasi (MHM).
- Informasi dan edukasi terkait kondisi krisis air.

AI berfungsi sebagai pendamping informasi. Penentuan status kondisi air dan rekomendasi utama tetap mengikuti aturan sistem yang telah ditetapkan.

### 4. Dashboard User

Area personal yang dapat diakses setelah pengguna login.

Fitur yang tersedia:
- Ringkasan kondisi air rumah tangga.
- Riwayat perhitungan Kalkulator Ketahanan Air.
- Monitoring kondisi air.
- Pengelolaan data keluarga.
- Pengiriman dan pemantauan kontribusi titik air.
- Pengaturan akun.

### 5. Dashboard Admin

Panel khusus untuk pengelolaan dan pengawasan data titik air.

Fitur yang tersedia:
- Ringkasan dashboard administrasi.
- Antrean verifikasi kontribusi titik air.
- Pemeriksaan detail kontribusi pengguna.
- Pengelolaan data titik air.
- Pembaruan informasi dan status verifikasi.
- Aktivasi dan penonaktifan data titik air.

Kontribusi yang belum diverifikasi tidak ditampilkan sebagai informasi titik air yang telah terkonfirmasi.

---

## 🛠️ Tech Stack

Teknologi utama yang digunakan dalam pengembangan AIRA:

| Category | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Programming Language | JavaScript |
| UI Library | React |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui & Radix UI |
| Icons | Lucide React |
| Typography | Plus Jakarta Sans & Inter |
| Backend & Database | Supabase |
| Authentication | Supabase Auth |
| AI Integration | Google Gemini API |
| Deployment | Vercel |
| Version Control | Git & GitHub |

### 🎨 Color Palette

AIRA menggunakan kombinasi warna yang merepresentasikan air bersih, keberlanjutan, dan kepedulian terhadap perempuan.

| Color | Name | Hex |
|---|---|---|
| <span style="color:#176B78">■</span> | Deep Ocean | `#176B78` |
| <span style="color:#4EA8DE">■</span> | Aqua Clean | `#4EA8DE` |
| <span style="color:#94D2BD">■</span> | Soft Sage | `#94D2BD` |
| <span style="color:#F9FBFB">■</span> | Ice White | `#F9FBFB` |
| <span style="color:#26363B">■</span> | Deep Charcoal | `#26363B` |
| <span style="color:#E99AB3">■</span> | Coral Peach | `#E99AB3` |
| <span style="color:#F4EBDD">■</span> | Soft Sand | `#F4EBDD` |

Warna dikelola melalui konfigurasi tema pada `app/globals.css`. Gunakan token warna yang telah tersedia agar tampilan tetap konsisten.

---

## 📁 Project Structure

AIRA menggunakan Next.js App Router dengan direktori `app/` pada root project.

```text
aira-website/
├── app/
│   ├── actions/                 # Server Actions
│   ├── api/                     # API Routes
│   ├── admin/                   # Dashboard Admin
│   ├── assistant/               # AIRA Assistant
│   ├── dashboard/               # Dashboard User
│   ├── kalkulator-air/          # Kalkulator Ketahanan Air
│   ├── navigasi-air/            # Navigasi Air
│   ├── masuk/                   # Login
│   ├── daftar/                  # Registrasi
│   ├── layout.js                # Root Layout
│   ├── page.js                  # Landing Page
│   └── globals.css              # Global Styles
│
├── components/
│   ├── ui/                      # Reusable UI Components
│   ├── admin/                   # Admin Components
│   └── ...                      # Shared Components
│
├── lib/                         # Utilities & Helpers
├── services/                    # Application Services
├── data/                        # Static or Supporting Data
├── public/                      # Static Assets
├── docs/                        # Project Documentation
│
├── components.json              # shadcn/ui Configuration
├── package.json                 # Dependencies & Scripts
├── next.config.js               # Next.js Configuration
└── README.md
```

*Catatan: Struktur di atas merupakan gambaran umum. Penempatan file dan direktori mengikuti implementasi aktual pada repository.*

---

## 🔄 System Workflow

### 1. Kalkulator Ketahanan Air

```text
Pengguna membuka Kalkulator Air
             |
             v
Mengisi data kebutuhan air rumah tangga
             |
             v
Sistem memvalidasi input
             |
             v
Menghitung estimasi ketahanan air
             |
             v
Menampilkan status kondisi air
             |
             v
Menampilkan rekomendasi tindakan
```

### 2. Navigasi Air

```text
Pengguna membuka Navigasi Air
             |
             v
Mencari atau memfilter titik air
             |
             v
Memilih titik air
             |
             v
Melihat detail informasi lokasi
             |
             v
Membuka petunjuk arah melalui Google Maps
```

Navigasi Air menggunakan tampilan daftar dan halaman detail, dengan integrasi Google Maps untuk petunjuk arah.

### 3. Kontribusi Titik Air

```text
Pengguna mengirim kontribusi
             |
             v
Data masuk ke antrean verifikasi
             |
             v
Admin memeriksa kontribusi
             |
             v
Admin menentukan status verifikasi
             |
             v
Data yang disetujui dapat dipublikasikan
```

---

## 🔐 User Access & Permissions

| Area | Access | Description |
|---|---|---|
| Public Pages | No Login Required | Mengakses fitur utama AIRA |
| User Dashboard | Authenticated User | Mengelola data keluarga, riwayat, monitoring, dan kontribusi |
| Admin Dashboard | Authorized Admin | Memverifikasi kontribusi dan mengelola titik air |

Pembatasan akses diterapkan melalui autentikasi dan pemeriksaan otorisasi pada sisi server maupun database sesuai peran pengguna.

---

## 📚 Documentation

Dokumentasi teknis dan pengembangan proyek dapat diakses melalui direktori `docs/`.

| Documentation | Description | Link |
|---|---|---|
| API Documentation | Dokumentasi endpoint dan API | `docs/API.md` |
| Swagger UI | Dokumentasi API interaktif | `/api-docs` |
| Backend Technical Documentation | Arsitektur backend, services, dan konfigurasi | `docs/BACKEND_TECHNICAL.md` |
| Database Schema Audit | Struktur tabel, relasi, dan RLS | `docs/DB_SCHEMA_AUDIT.md` |
| Database ERD | Entity Relationship Diagram (DBML) | `docs/aira-core-erd.dbml` |
| UAT Checklist | Skenario pengujian aplikasi | `docs/UAT_CHECKLIST.md` |
| Backend Audit | Catatan evaluasi dan backlog backend | `docs/BE_BACKLOG_AUDIT.md` |

---

## ⚙️ Installation & Setup

Ikuti langkah berikut untuk menjalankan AIRA secara lokal.

### Prerequisites

Pastikan perangkat telah memiliki:
- Node.js
- npm
- Git

### 1. Clone Repository

```bash
git clone <repository-url>
```

### 2. Navigate to Project Directory

```bash
cd aira-website
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Buat file `.env.local` pada root project dan sesuaikan variabel lingkungan dengan konfigurasi layanan yang digunakan.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

Tambahkan variabel lain sesuai kebutuhan integrasi dan dokumentasi backend.

**Penting:** Jangan pernah mengunggah file `.env.local` atau membagikan secret key ke repository publik.

### 5. Run Development Server

```bash
npm run dev
```

Buka browser dan akses:

```text
http://localhost:3000
```

### 6. Build for Production

```bash
npm run build
```

---

## 🤝 Development Guidelines

Beberapa pedoman yang digunakan selama pengembangan AIRA:

1. **Consistent Code Structure** — Ikuti struktur direktori dan konvensi penamaan yang telah disepakati.
2. **Reusable Components** — Gunakan kembali komponen UI untuk menjaga konsistensi tampilan.
3. **Design Consistency** — Sesuaikan implementasi dengan desain dan design system AIRA.
4. **Data Accuracy** — Pastikan informasi titik air memiliki sumber dan status verifikasi yang jelas.
5. **Secure Access** — Terapkan autentikasi, otorisasi, dan perlindungan data pengguna.
6. **Reliable Calculation** — Validasi input dan gunakan aturan perhitungan yang konsisten.
7. **Collaborative Development** — Koordinasikan perubahan kode melalui Git dan GitHub.

---

## 📌 Project Scope & Disclaimer

AIRA dikembangkan sebagai platform pendukung edukasi dan pengambilan keputusan terkait ketahanan air rumah tangga.

Beberapa hal yang perlu diperhatikan:

- Hasil kalkulator merupakan estimasi berdasarkan data dan parameter yang tersedia, bukan jaminan ketersediaan air.
- Informasi titik air mengikuti sumber data dan waktu pembaruan yang tersedia.
- Status verifikasi titik air tidak otomatis menjamin kualitas atau kelayakan air untuk diminum.
- Informasi dari AIRA Assistant merupakan panduan edukatif dan tidak menggantikan pengujian kualitas air maupun arahan dari instansi berwenang.

---

## 👩‍💻 Contributors

AIRA dikembangkan melalui kolaborasi tim dalam program Perempuan Inovasi.

| Name | Role | GitHub |
|---|---|---|
| | | |
| | | |
| | | |
| | | |

---

<p align="center">
  <strong>AIRA — Smart Water Resilience for Every Woman</strong>
  <br />
  <em>Access. Intelligence. Resilience. Action.</em>
</p>