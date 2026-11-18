import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getAdminUserById } from "@/services/adminUserService";

/**
 * GET /api/admin/users/[id]
 *
 * Mengambil detail pengguna berdasarkan user_id.
 * Hanya dapat diakses oleh admin aktif.
 */
export async function GET(request, { params }) {
  try {
    // 1. Validasi autentikasi dan otorisasi admin.
    const auth = await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    // 2. Ambil ID dari dynamic route.
    const { id } = await params;

    // 3. Validasi ID pengguna.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!id || !uuidPattern.test(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID pengguna tidak valid.",
        },
        { status: 400 }
      );
    }

    // 4. Ambil detail pengguna dari service.
    const user = await getAdminUserById(id);

    // 5. Tangani jika pengguna tidak ditemukan.
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Data pengguna tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // 6. Kirim respons berhasil.
    return NextResponse.json(
      {
        success: true,
        message: "Detail pengguna berhasil diambil.",
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/users/[id]]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil detail pengguna.",
      },
      { status: 500 }
    );
  }
} 