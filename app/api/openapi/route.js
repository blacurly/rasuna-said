import { NextResponse } from "next/server";

const response = (description, example) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiSuccess" },
      examples: { default: { value: example } },
    },
  },
});

const failure = (description, status, code, message) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiError" },
      examples: {
        default: {
          value: {
            success: false,
            message,
            error: { code, details: null },
          },
        },
      },
    },
  },
});

const authDescription =
  "Memerlukan sesi Supabase yang valid melalui cookie. Identitas dan role diambil dari sesi server; jangan mengirim user_id atau role sebagai identitas tepercaya.";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "AIRA Website API",
    version: "1.1.0",
    description:
      "REST API AIRA untuk kalkulator ketahanan air, Navigasi Air, kontribusi titik air, AIRA Assistant berbasis retrieval dokumen (RAG), profil keluarga, dan administrasi. Spesifikasi ini hanya mendokumentasikan operasi yang benar-benar tersedia pada Route Handlers saat ini. Operasi CRUD yang belum tersedia tidak dicantumkan sebagai endpoint aktif.",
    contact: { name: "AIRA Project Team" },
  },
  servers: [{ url: "/", description: "Origin aplikasi AIRA" }],
  tags: [
    { name: "Assistant", description: "Tanya jawab air, sanitasi, dan ketahanan iklim berbasis retrieval dokumen AIRA." },
    { name: "Water Navigation", description: "Direktori titik air terverifikasi yang dapat diakses publik." },
    { name: "Contributions", description: "Pengajuan dan riwayat kontribusi titik air milik pengguna." },
    { name: "Water Assessments", description: "Kalkulasi ketahanan air dan riwayat asesmen pengguna." },
    { name: "Households", description: "Profil rumah tangga pengguna." },
    { name: "Admin", description: "Pengelolaan pengguna, verifikasi kontribusi, dan aktivitas admin." },
    { name: "Profile", description: "Profil akun yang sedang login." },
  ],
  components: {
    securitySchemes: {
      SupabaseCookieSession: {
        type: "apiKey",
        in: "cookie",
        name: "sb-<project-ref>-auth-token",
        description:
          "Autentikasi menggunakan cookie sesi Supabase yang dikelola aplikasi. Nama cookie aktual dapat berbeda sesuai konfigurasi Supabase SSR. Swagger UI tidak dapat membuat sesi; login terlebih dahulu pada aplikasi AIRA di origin yang sama.",
      },
    },
    schemas: {
      ApiSuccess: {
        type: "object",
        required: ["success", "message", "data"],
        properties: {
          success: { type: "boolean", const: true },
          message: { type: "string" },
          data: {},
        },
        example: { success: true, message: "Permintaan berhasil.", data: {} },
      },
      ApiError: {
        type: "object",
        required: ["success", "message", "error"],
        properties: {
          success: { type: "boolean", const: false },
          message: { type: "string" },
          error: {
            type: "object",
            required: ["code", "details"],
            properties: {
              code: { type: "string" },
              details: {},
            },
          },
        },
        example: {
          success: false,
          message: "Silakan masuk terlebih dahulu.",
          error: { code: "UNAUTHENTICATED", details: null },
        },
      },
      AssistantRequest: {
        type: "object",
        additionalProperties: false,
        required: ["question"],
        properties: {
          question: { type: "string", minLength: 1, maxLength: 2000, example: "Bagaimana cara menghemat air saat musim kemarau?" },
          history: {
            type: "array",
            maxItems: 6,
            description: "Riwayat percakapan opsional. Hanya role user dan assistant yang digunakan; setiap konten dipotong maksimal 1.500 karakter oleh Server Action.",
            items: {
              type: "object",
              required: ["role", "content"],
              properties: {
                role: { type: "string", enum: ["user", "assistant"] },
                content: { type: "string", maxLength: 1500 },
              },
            },
          },
        },
        example: {
          question: "Bagaimana cara menghemat air saat musim kemarau?",
          history: [{ role: "user", content: "Apa itu ketahanan air rumah tangga?" }],
        },
      },
      AssistantResponse: {
        type: "object",
        properties: {
          answer: { type: "string" },
          mode: { type: "string", enum: ["rag", "hybrid", "llm", "no_source", "out_of_scope"] },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                publisher: { type: "string" },
                page_start: { type: ["integer", "null"] },
                page_end: { type: ["integer", "null"] },
              },
            },
          },
          historySaved: { type: "boolean", description: "True jika riwayat berhasil disimpan untuk pengguna yang sedang login." },
        },
        example: {
          answer: "Gunakan air sesuai kebutuhan, periksa kebocoran, dan simpan air dalam wadah tertutup.",
          mode: "rag",
          sources: [{ title: "Panduan Penghematan Air Rumah Tangga", publisher: "Dokumen referensi AIRA", page_start: 4, page_end: 5 }],
          historySaved: false,
        },
      },
      WaterAssessmentRequest: {
        type: "object",
        required: ["anggota", "sumberAir", "kondisi", "kapasitas", "persen"],
        properties: {
          lokasi: { type: "string", maxLength: 300, example: "Rongkop, Gunungkidul" },
          anggota: { type: "integer", minimum: 1, maximum: 30, example: 4 },
          sumberAir: { type: "string", enum: ["PDAM / Air Perpipaan", "Sumur Gali/Bor", "Air Hujan", "Mata Air / Posko"] },
          kondisi: { type: "string", enum: ["Normal", "Terbatas", "Tidak Berfungsi", "Belum diketahui"] },
          kapasitas: { type: ["number", "string"], example: 1200 },
          persen: { type: "number", minimum: 0, maximum: 100, example: 50 },
          mhm: { type: "boolean", example: true },
          anggotaMhm: { type: "integer", minimum: 0, maximum: 30, example: 2 },
          luasAtap: { type: ["number", "string"], minimum: 0, maximum: 1000, example: 60 },
        },
        example: {
          lokasi: "Rongkop, Gunungkidul",
          anggota: 4,
          sumberAir: "Sumur gali / bor",
          kondisi: "Terbatas",
          kapasitas: 1200,
          persen: 50,
          mhm: true,
          anggotaMhm: 2,
          luasAtap: 60,
        },
      },
      HouseholdRequest: {
        type: "object",
        required: ["namaRumahTangga", "anggota", "sumberAir", "kapasitas"],
        properties: {
          namaRumahTangga: { type: "string", maxLength: 150, example: "Keluarga Sejahtera" },
          wilayahDesa: { type: "string", maxLength: 300, example: "Desa Semugih, Rongkop" },
          anggota: { type: "integer", minimum: 1, maximum: 30, example: 4 },
          mhm: { type: "boolean", example: true },
          anggotaMhm: { type: "integer", minimum: 0, example: 2 },
          sumberAir: { type: "string", enum: ["PDAM / Air perpipaan", "Sumur gali / bor", "Mata air", "Air hujan", "Tangki / air bersih truk"], example: "Sumur gali / bor" },
          kapasitas: { type: "number", minimum: 0, maximum: 100000, example: 1200 },
        },
        example: {
          namaRumahTangga: "Keluarga Sejahtera",
          wilayahDesa: "Desa Semugih, Rongkop",
          anggota: 4,
          mhm: true,
          anggotaMhm: 2,
          sumberAir: "Sumur gali / bor",
          kapasitas: 1200,
        },
      },
      ContributionRequest: {
        type: "object",
        required: ["contribution_type"],
        properties: {
          contribution_type: { type: "string", enum: ["new_point", "update_point"] },
          water_point_id: { type: ["integer", "null"], example: null },
          proposed_point_name: { type: ["string", "null"], example: "Sumur Komunal RT 04" },
          proposed_water_source_type: { type: ["string", "null"], example: "public_well" },
          proposed_description: { type: ["string", "null"] },
          proposed_province_id: { type: ["integer", "null"] },
          proposed_city_regency_id: { type: ["integer", "null"] },
          proposed_district_id: { type: ["integer", "null"] },
          proposed_village: { type: ["string", "null"] },
          proposed_address_detail: { type: ["string", "null"], example: "RT 04/RW 02, Desa Semugih" },
          proposed_latitude: { type: ["number", "null"], minimum: -90, maximum: 90 },
          proposed_longitude: { type: ["number", "null"], minimum: -180, maximum: 180 },
          proposed_availability_status: { type: ["string", "null"], enum: ["available", "limited", "unavailable", "unknown", null] },
          proposed_access_information: { type: ["string", "null"] },
          proposed_opening_hours: { type: ["string", "null"] },
          evidence_url: { type: ["string", "null"], format: "uri" },
          notes: { type: ["string", "null"] },
        },
        example: {
          contribution_type: "new_point",
          proposed_point_name: "Sumur Komunal RT 04",
          proposed_water_source_type: "public_well",
          proposed_province_id: 34,
          proposed_city_regency_id: 3403,
          proposed_district_id: 340312,
          proposed_village: "Semugih",
          proposed_address_detail: "RT 04/RW 02",
          proposed_latitude: -8.045,
          proposed_longitude: 110.735,
          proposed_availability_status: "available",
          proposed_access_information: "Pengelola: Kelompok Air RT 04",
          proposed_opening_hours: "06.00-18.00",
          evidence_url: "https://maps.google.com/?q=-8.045,110.735",
          notes: "Saya melihat langsung.",
        },
      },
      ReviewContributionRequest: {
        type: "object",
        required: ["reviewStatus"],
        properties: {
          reviewStatus: { type: "string", enum: ["approved", "rejected", "needs_revision"] },
          reviewNotes: { type: ["string", "null"], maxLength: 2000 },
          availabilityStatus: { type: "string", enum: ["available", "limited", "unavailable", "unknown"], description: "Wajib jika reviewStatus=approved." },
        },
        example: { reviewStatus: "needs_revision", reviewNotes: "Mohon lengkapi jam akses dan nama pengelola." },
      },
      Pagination: {
        type: "object",
        properties: {
          limit: { type: "integer" },
          offset: { type: "integer" },
          total: { type: "integer" },
          hasMore: { type: "boolean" },
        },
      },
    },
  },
  paths: {
    "/api/assistant": {
      post: {
        tags: ["Assistant"],
        summary: "Kirim pertanyaan ke AIRA Assistant",
        description: "Endpoint publik. Jawaban menggunakan pipeline retrieval dokumen AIRA dan Gemini. Riwayat percakapan hanya disimpan jika pengguna memiliki sesi login. Jangan mengirim data pribadi atau informasi sensitif.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssistantRequest" } } } },
        responses: {
          "200": { description: "Jawaban Assistant", content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiSuccess" }, { properties: { data: { $ref: "#/components/schemas/AssistantResponse" } } }] } } } },
          "400": failure("Body JSON tidak valid.", 400, "INVALID_JSON", "Body JSON tidak valid."),
          "422": failure("Pertanyaan kosong atau terlalu panjang.", 422, "VALIDATION_ERROR", "Pertanyaan tidak boleh kosong."),
          "502": failure("Layanan AI atau retrieval gagal.", 502, "ASSISTANT_UNAVAILABLE", "AIRA Assistant sedang mengalami gangguan."),
          "504": failure("Batas waktu permintaan Assistant tercapai.", 504, "ASSISTANT_TIMEOUT", "AIRA Assistant membutuhkan waktu lebih lama dari batas permintaan."),
        },
      },
    },
    "/api/water-navigation": {
      get: {
        tags: ["Water Navigation"],
        summary: "Daftar titik air publik terverifikasi",
        description: "Hanya titik air aktif, terverifikasi, dan bukan data simulasi yang ditampilkan.",
        parameters: [
          { in: "query", name: "q", schema: { type: "string" }, description: "Kata kunci pencarian." },
          { in: "query", name: "type", schema: { type: "string" }, description: "Jenis sumber air." },
          { in: "query", name: "province", schema: { type: "string" } },
          { in: "query", name: "regency", schema: { type: "string" } },
          { in: "query", name: "district", schema: { type: "string" } },
          { in: "query", name: "availableOnly", schema: { type: "boolean" } },
          { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { in: "query", name: "offset", schema: { type: "integer", minimum: 0, default: 0 } },
        ],
        responses: {
          "200": response("Daftar titik air publik.", { success: true, message: "Daftar titik air berhasil diambil.", data: { items: [], pagination: { limit: 20, offset: 0, total: 0, hasMore: false } } }),
          "400": failure("Parameter tidak valid.", 400, "INVALID_QUERY", "Filter tidak valid."),
          "503": failure("Data tidak tersedia.", 503, "WATER_NAVIGATION_UNAVAILABLE", "Data titik air tidak tersedia."),
        },
      },
    },
    "/api/water-navigation/{id}": {
      get: {
        tags: ["Water Navigation"],
        summary: "Detail titik air publik",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: {
          "200": response("Detail titik air.", { success: true, message: "Detail titik air berhasil diambil.", data: { water_point_id: 1, point_name: "Sumur Komunal RT 04", verification_status: "verified", is_active: true, is_simulation: false } }),
          "404": failure("Titik air tidak ditemukan atau tidak publik.", 404, "NOT_FOUND", "Titik air tidak ditemukan."),
        },
      },
    },
    "/api/contributions": {
      get: {
        tags: ["Contributions"], summary: "Riwayat kontribusi milik pengguna login", description: authDescription,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [{ in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }, { in: "query", name: "offset", schema: { type: "integer", minimum: 0, default: 0 } }],
        responses: {
          "200": response("Riwayat kontribusi.", { success: true, message: "Riwayat kontribusi berhasil diambil.", data: { items: [], pagination: { limit: 20, offset: 0, total: 0, hasMore: false } } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
        },
      },
      post: {
        tags: ["Contributions"], summary: "Kirim kontribusi titik air", description: `${authDescription} Kontribusi disimpan sebagai usulan dan tidak langsung mengubah direktori publik.`,
        security: [{ SupabaseCookieSession: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ContributionRequest" } } } },
        responses: {
          "201": response("Kontribusi berhasil dikirim dan menunggu verifikasi.", { success: true, message: "Kontribusi terkirim dan menunggu verifikasi admin.", data: { contribution_id: 101, status: "pending" } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "422": failure("Validasi kontribusi gagal.", 422, "CONTRIBUTION_VALIDATION_FAILED", "Data kontribusi belum valid."),
        },
      },
    },
    "/api/contributions/{id}": {
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
      get: {
        tags: ["Contributions"], summary: "Detail kontribusi milik pengguna login", description: `Hanya pemilik kontribusi yang dapat membacanya. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        responses: {
          "200": response("Detail kontribusi.", { success: true, message: "Detail kontribusi berhasil diambil.", data: { contribution_id: 101, status: "needs_revision", proposed_point_name: "Sumur Komunal RT 04" } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "404": failure("Kontribusi tidak ditemukan.", 404, "NOT_FOUND", "Kontribusi tidak ditemukan."),
        },
      },
      patch: {
        tags: ["Contributions"], summary: "Perbarui dan kirim ulang kontribusi yang perlu perbaikan", description: `Hanya pemilik kontribusi berstatus needs_revision yang dapat memperbarui usulan. Status kembali menjadi pending. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ContributionRequest" } } } },
        responses: {
          "200": response("Kontribusi diperbarui dan dikirim ulang.", { success: true, message: "Kontribusi diperbarui dan dikirim kembali untuk verifikasi.", data: { contribution_id: 101, status: "pending" } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "404": failure("Kontribusi tidak ditemukan.", 404, "NOT_FOUND", "Kontribusi tidak ditemukan."),
          "409": failure("Kontribusi tidak dapat diperbarui pada status saat ini.", 409, "CONTRIBUTION_NOT_EDITABLE", "Kontribusi hanya dapat diperbarui ketika statusnya Perlu Perbaikan."),
          "422": failure("Validasi kontribusi gagal.", 422, "CONTRIBUTION_VALIDATION_FAILED", "Data kontribusi belum valid."),
        },
      },
      delete: {
        tags: ["Contributions"], summary: "Batalkan kontribusi yang masih menunggu verifikasi", description: `Hanya pemilik kontribusi berstatus pending yang belum memiliki riwayat pemeriksaan yang dapat membatalkan pengajuan. Riwayat review tidak dihapus. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        responses: {
          "200": response("Kontribusi dibatalkan.", { success: true, message: "Kontribusi berhasil dibatalkan.", data: { contribution_id: 101 } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "404": failure("Kontribusi tidak ditemukan.", 404, "NOT_FOUND", "Kontribusi tidak ditemukan."),
          "409": failure("Kontribusi tidak dapat dibatalkan karena status atau riwayat review.", 409, "CONTRIBUTION_NOT_CANCELLABLE", "Kontribusi hanya dapat dibatalkan ketika masih Menunggu Verifikasi."),
        },
      },
    },
    "/api/admin/contributions": {
      get: {
        tags: ["Admin"], summary: "Daftar antrean kontribusi", description: `Khusus admin aktif. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [{ in: "query", name: "status", schema: { type: "string", enum: ["pending", "approved", "rejected", "needs_revision"] } }, { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100 } }, { in: "query", name: "offset", schema: { type: "integer", minimum: 0 } }],
        responses: {
          "200": response("Antrean kontribusi.", { success: true, message: "Antrean kontribusi berhasil diambil.", data: { items: [] } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "403": failure("Bukan admin.", 403, "ADMIN_REQUIRED", "Akses khusus admin AIRA."),
        },
      },
    },
    "/api/admin/contributions/{id}": {
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
      get: {
        tags: ["Admin"], summary: "Detail kontribusi untuk verifikasi", description: `Khusus admin aktif. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        responses: {
          "200": response("Detail kontribusi.", { success: true, message: "Detail kontribusi berhasil diambil.", data: { id: 101, name: "Sumur Komunal RT 04", reviewStatus: "pending" } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "403": failure("Bukan admin.", 403, "ADMIN_REQUIRED", "Akses khusus admin AIRA."),
          "404": failure("Kontribusi tidak ditemukan.", 404, "NOT_FOUND", "Kontribusi tidak ditemukan."),
        },
      },
      patch: {
        tags: ["Admin"], summary: "Setujui, tolak, atau minta revisi kontribusi", description: `Khusus admin aktif. Keputusan diproses melalui RPC database; hanya persetujuan admin yang dapat memublikasikan usulan sebagai titik air. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReviewContributionRequest" } } } },
        responses: {
          "200": response("Keputusan verifikasi tersimpan.", { success: true, message: "Keputusan verifikasi berhasil disimpan.", data: { contribution_id: 101, review_status: "needs_revision" } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "403": failure("Bukan admin.", 403, "ADMIN_REQUIRED", "Akses khusus admin AIRA."),
          "422": failure("Keputusan atau status ketersediaan tidak valid.", 422, "INVALID_REVIEW_STATUS", "Keputusan verifikasi tidak valid."),
        },
      },
    },
    "/api/admin/activity-logs": {
      get: {
        tags: ["Admin"], summary: "Riwayat aktivitas admin", description: `Khusus admin aktif. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [{ in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } }, { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 50, default: 10 } }, { in: "query", name: "actionType", schema: { type: "string", enum: ["all", "user_status_updated"], default: "all" } }],
        responses: {
          "200": { description: "Riwayat aktivitas admin. Endpoint ini menggunakan bentuk response legacy: data berisi array dan pagination berada di level teratas.", content: { "application/json": { example: { success: true, message: "Riwayat aktivitas admin berhasil diambil.", data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } } } },
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "403": failure("Bukan admin.", 403, "ADMIN_REQUIRED", "Akses khusus admin AIRA."),
        },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"], summary: "Daftar pengguna", description: `Khusus admin aktif. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 50, default: 10 } },
          { in: "query", name: "search", schema: { type: "string" }, description: "Pencarian nama atau email." },
          { in: "query", name: "role", schema: { type: "string", enum: ["admin", "user"] } },
          { in: "query", name: "accountStatus", schema: { type: "string", enum: ["active", "inactive", "suspend"] } },
          { in: "query", name: "sortBy", schema: { type: "string", enum: ["created_at", "updated_at", "full_name", "email"], default: "created_at" } },
          { in: "query", name: "sortOrder", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: {
          "200": { description: "Daftar pengguna. Endpoint ini menggunakan bentuk response legacy: data berisi array dan pagination berada di level teratas.", content: { "application/json": { example: { success: true, message: "Daftar pengguna berhasil diambil.", data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } } } },
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "403": failure("Bukan admin.", 403, "ADMIN_REQUIRED", "Akses khusus admin AIRA."),
        },
      },
    },
    "/api/admin/users/{id}": {
      get: {
        tags: ["Admin"], summary: "Detail pengguna", description: `Khusus admin aktif. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": response("Detail pengguna.", { success: true, message: "Detail pengguna berhasil diambil.", data: { user_id: "00000000-0000-4000-8000-000000000001", role: "user", account_status: "active" } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "403": failure("Bukan admin.", 403, "ADMIN_REQUIRED", "Akses khusus admin AIRA."),
          "404": failure("Pengguna tidak ditemukan.", 404, "NOT_FOUND", "Pengguna tidak ditemukan."),
        },
      },
    },
    "/api/admin/users/{id}/status": {
      patch: {
        tags: ["Admin"], summary: "Perbarui status akun pengguna", description: `Khusus admin aktif. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["account_status"], properties: { account_status: { type: "string", enum: ["active", "inactive", "suspend"] } }, example: { account_status: "inactive" } } } } },
        responses: {
          "200": response("Status akun diperbarui.", { success: true, message: "Status akun berhasil diperbarui.", data: { user_id: "00000000-0000-4000-8000-000000000001", account_status: "inactive" } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "403": failure("Bukan admin.", 403, "ADMIN_REQUIRED", "Akses khusus admin AIRA."),
          "422": failure("Status akun tidak valid.", 422, "INVALID_ACCOUNT_STATUS", "Status akun tidak valid."),
        },
      },
    },
    "/api/admin/users/stats": {
      get: {
        tags: ["Admin"], summary: "Statistik pengguna", description: `Khusus admin aktif. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        responses: {
          "200": response("Statistik pengguna.", { success: true, message: "Statistik pengguna berhasil diambil.", data: { total: 0, active: 0, inactive: 0 } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "403": failure("Bukan admin.", 403, "ADMIN_REQUIRED", "Akses khusus admin AIRA."),
        },
      },
    },
    "/api/water-assessments": {
      get: {
        tags: ["Water Assessments"], summary: "Riwayat kalkulator milik pengguna login", description: `Hanya mengembalikan asesmen milik pengguna yang sedang login. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [{ in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }, { in: "query", name: "offset", schema: { type: "integer", minimum: 0, default: 0 } }],
        responses: {
          "200": response("Riwayat asesmen.", { success: true, message: "Riwayat kalkulator berhasil diambil.", data: { items: [], pagination: { limit: 20, offset: 0, total: 0, hasMore: false } } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
        },
      },
      post: {
        tags: ["Water Assessments"], summary: "Hitung ketahanan air", description: "Endpoint dapat digunakan tanpa login untuk menghitung. Hasil hanya tersimpan sebagai riwayat bila sesi pengguna tersedia dan proses penyimpanan berhasil.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/WaterAssessmentRequest" } } } },
        responses: {
          "200": response("Perhitungan berhasil; riwayat tidak tersimpan.", { success: true, message: "Perhitungan berhasil. Riwayat tidak disimpan karena pengguna belum masuk atau penyimpanan tidak tersedia.", data: { valid: true, status: "Waspada", durasiHari: 2.5, potensiPanenAirHujanLiter: null } }),
          "201": response("Perhitungan berhasil dan riwayat tersimpan.", { success: true, message: "Perhitungan berhasil dan riwayat tersimpan.", data: { valid: true, status: "Waspada", durasiHari: 2.5, penyimpanan: { saved: true } } }),
          "400": failure("Body JSON tidak valid.", 400, "INVALID_JSON", "Body JSON tidak valid."),
          "422": failure("Input kalkulator tidak valid.", 422, "CALCULATION_VALIDATION_FAILED", "Data kalkulator belum valid."),
        },
      },
    },
    "/api/water-assessments/{id}": {
      get: {
        tags: ["Water Assessments"], summary: "Detail asesmen milik pengguna login", description: `Hanya pemilik asesmen yang dapat membacanya. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: {
          "200": response("Detail asesmen dan rekomendasi.", { success: true, message: "Detail asesmen berhasil diambil.", data: { assessment_id: 1, available_water_liters: 600, daily_need_liters: 80, estimated_duration_days: 7.5, assessment_recommendations: [] } }),
          "400": failure("ID asesmen tidak valid.", 400, "INVALID_ID", "ID asesmen tidak valid."),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "404": failure("Asesmen tidak ditemukan atau bukan milik pengguna.", 404, "NOT_FOUND", "Riwayat asesmen tidak ditemukan."),
        },
      },
      patch: {
        tags: ["Water Assessments"], summary: "Perbarui catatan asesmen milik pengguna", description: `Hanya catatan asesmen yang dapat diubah; hasil kalkulasi dan snapshot input dipertahankan sebagai rekaman historis. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: false, properties: { assessment_notes: { type: ["string", "null"], maxLength: 2000 } }, example: { assessment_notes: "Data diperbarui setelah pengecekan kondisi tandon." } } } } },
        responses: {
          "200": response("Catatan asesmen diperbarui.", { success: true, message: "Catatan asesmen berhasil diperbarui.", data: { assessment_id: 1, assessment_notes: "Data diperbarui setelah pengecekan kondisi tandon." } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "404": failure("Asesmen tidak ditemukan.", 404, "NOT_FOUND", "Riwayat asesmen tidak ditemukan."),
          "422": failure("Catatan tidak valid.", 422, "ASSESSMENT_VALIDATION_FAILED", "Catatan asesmen tidak valid."),
        },
      },
      delete: {
        tags: ["Water Assessments"], summary: "Hapus riwayat asesmen", description: `Hanya pemilik asesmen yang dapat menghapusnya. Penghapusan ditolak jika asesmen sudah memiliki rekomendasi atau interaksi Assistant agar relasi historis tidak terputus. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: {
          "200": response("Riwayat asesmen dihapus.", { success: true, message: "Riwayat asesmen berhasil dihapus.", data: { assessment_id: 1 } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "404": failure("Asesmen tidak ditemukan.", 404, "NOT_FOUND", "Riwayat asesmen tidak ditemukan."),
          "409": failure("Asesmen memiliki data turunan.", 409, "ASSESSMENT_HAS_DEPENDENCIES", "Riwayat tidak dapat dihapus karena memiliki data terkait."),
        },
      },
    },
    "/api/households": {
      get: {
        tags: ["Households"], summary: "Ambil profil rumah tangga pengguna", description: `Mengambil satu data rumah tangga terbaru milik pengguna. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        responses: {
          "200": response("Data rumah tangga; data dapat bernilai null jika belum diisi.", { success: true, message: "Data keluarga belum diisi.", data: null }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
        },
      },
      post: {
        tags: ["Households"], summary: "Buat atau perbarui profil rumah tangga", description: `Menyimpan profil rumah tangga pengguna aktif. Operasi ini melakukan create bila belum ada profil dan update pada profil terbaru bila sudah ada. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/HouseholdRequest" } } } },
        responses: {
          "200": response("Profil rumah tangga tersimpan.", { success: true, message: "Data keluarga berhasil disimpan.", data: { household_id: 1, household_name: "Keluarga Sejahtera", member_count: 4 } }),
          "400": failure("Body JSON tidak valid.", 400, "INVALID_JSON", "Body JSON tidak valid."),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "422": failure("Validasi profil keluarga gagal.", 422, "HOUSEHOLD_VALIDATION_FAILED", "Data keluarga belum valid."),
        },
      },
    },
    "/api/households/{id}": {
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } }],
      get: {
        tags: ["Households"], summary: "Detail rumah tangga milik pengguna login", description: authDescription,
        security: [{ SupabaseCookieSession: [] }],
        responses: {
          "200": response("Detail rumah tangga.", { success: true, message: "Detail rumah tangga berhasil diambil.", data: { household_id: 1, household_name: "Keluarga Sejahtera", member_count: 4 } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "404": failure("Rumah tangga tidak ditemukan.", 404, "NOT_FOUND", "Data rumah tangga tidak ditemukan."),
        },
      },
      patch: {
        tags: ["Households"], summary: "Perbarui data rumah tangga", description: `Hanya pemilik data yang dapat memperbarui rumah tangga. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/HouseholdRequest" } } } },
        responses: {
          "200": response("Rumah tangga diperbarui.", { success: true, message: "Data rumah tangga berhasil diperbarui.", data: { household_id: 1, household_name: "Keluarga Sejahtera", member_count: 4 } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "404": failure("Rumah tangga tidak ditemukan.", 404, "NOT_FOUND", "Data rumah tangga tidak ditemukan."),
          "422": failure("Validasi rumah tangga gagal.", 422, "HOUSEHOLD_VALIDATION_FAILED", "Data rumah tangga belum valid."),
        },
      },
      delete: {
        tags: ["Households"], summary: "Hapus data rumah tangga", description: `Penghapusan hanya dilakukan jika tidak ada anggota keluarga, asesmen, atau interaksi Assistant yang masih terhubung. ${authDescription}`,
        security: [{ SupabaseCookieSession: [] }],
        responses: {
          "200": response("Rumah tangga dihapus.", { success: true, message: "Data rumah tangga berhasil dihapus.", data: { household_id: 1 } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
          "404": failure("Rumah tangga tidak ditemukan.", 404, "NOT_FOUND", "Data rumah tangga tidak ditemukan."),
          "409": failure("Rumah tangga memiliki data turunan.", 409, "HOUSEHOLD_HAS_DEPENDENCIES", "Data keluarga tidak dapat dihapus karena masih memiliki data terkait."),
        },
      },
    },
    "/api/profile": {
      get: {
        tags: ["Profile"], summary: "Profil pengguna login", description: authDescription,
        security: [{ SupabaseCookieSession: [] }],
        responses: {
          "200": response("Profil pengguna.", { success: true, message: "Profil berhasil diambil.", data: { user_id: "00000000-0000-4000-8000-000000000001", full_name: "Pengguna AIRA", role: "user", account_status: "active" } }),
          "401": failure("Belum login.", 401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu."),
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, { headers: { "Cache-Control": "no-store" } });
}
