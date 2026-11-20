# AIRA — Smart Water Resilience for Every Woman

**AIRA (Access, Intelligence, Resilience, Action)** merupakan platform digital untuk membantu perempuan dan keluarga, terutama di wilayah yang menghadapi kekeringan atau keterbatasan akses air bersih, memahami kondisi cadangan air, memperoleh rekomendasi tindakan, dan menemukan informasi titik air alternatif.

## Fitur
- **Kalkulator Ketahanan Air:** memperkirakan ketahanan cadangan air rumah tangga dan memberikan status serta rekomendasi berbasis aturan.
- **Navigasi Air:** pencarian, filter, detail, dan petunjuk lokasi titik air yang memenuhi kriteria publikasi.
- **AIRA Assistant:** bantuan informasi air, sanitasi, dan MHM dengan dukungan AI dan sumber dokumen.
- **Dashboard User:** ringkasan, riwayat perhitungan, monitoring, data keluarga, kontribusi, dan pengaturan akun.
- **Dashboard Admin:** verifikasi kontribusi, pengelolaan titik air, serta pengawasan data.

## Teknologi
| Area | Stack |
|---|---|
| Framework | Next.js App Router, JavaScript |
| UI | React, Tailwind CSS, Lucide React |
| Backend/database | Supabase (Auth, Postgres, RLS, RPC) |
| AI | Gemini integration (server-side) |
| Deployment | Vercel |

## Setup lokal
1. Clone repository dan masuk ke folder `aira-website`.
2. Install dependency: `npm install`.
3. Siapkan environment variables sesuai bagian **Environment variables** di dokumentasi teknis dan konfigurasi project Supabase/Gemini.
4. Jalankan development server: `npm run dev`.
5. Buka `http://localhost:3000`.

## Environment variables
Nama variabel yang diperlukan harus mengikuti file konfigurasi dan pemanggilan pada repository. Jangan commit `.env.local`, API keys, service-role keys, atau credential.

## Commands
```bash
npm run dev
npm test
npm run lint
npm run build
npm run start
```

## Dokumentasi
- [API reference](docs/API.md)
- [Backend technical notes](docs/BACKEND_TECHNICAL.md)
- [Database schema audit](docs/DB_SCHEMA_AUDIT.md)
- [Database ERD (DBML)](docs/aira-core.erd.dbml)
- [Review workflow](docs/REVIEW_WORKFLOW.md)
- [Migration guide](docs/DB_MIGRATION_GUIDE.md)
- [Repair audit report](docs/REPAIR_AUDIT_REPORT.md)
- [UAT checklist](docs/UAT_CHACKELIST.md)
- API docs/Swagger page: `/api-docs`

## Security notes
- Authenticated identity and admin authorization must be verified on the server.
- User-owned resources must be constrained by authenticated user ID and RLS or secure RPC.
- Public Water Navigation data must not include inactive, unverified, or simulation points.
- Admin removal of a water point is a soft deactivation (`is_active=false`) to preserve data and relationships.
- Assessment history deletion is permanently destructive for the assessment and directly linked recommendations/Assistant interactions; it is ownership-checked and transactional.
- Never commit secrets or service-role credentials.

## Project links
| Resource | Link |
|---|---|
| Deployment | https://aira-for-every-woman.vercel.app |
| Repository | Add repository URL |
| Design | Add Figma URL |
| Presentation | Add presentation URL |
