import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getAdminUserStats } from "@/services/adminUserService";

/**
 * GET /api/admin/users/stats
 *
 * Mengambil statistik pengguna untuk Admin Dashboard.
 * Hanya dapat diakses oleh admin dengan status active.
 */
export async function GET() {
  try {
    // 1. Validasi autentikasi dan otorisasi admin.
    const auth = await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    // 2. Ambil statistik dari Supabase.
    const stats = await getAdminUserStats();

    // 3. Kirim respons berhasil.
    return NextResponse.json(
      {
        success: true,
        message: "Statistik pengguna berhasil diambil.",
        data: stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/users/stats]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil statistik pengguna.",
      },
      { status: 500 }
    );
  }
}