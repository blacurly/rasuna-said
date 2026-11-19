import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getAdminActivityLogs } from "@/services/adminActivityLogService";

const VALID_ACTION_TYPES = [
  "all",
  "user_status_updated",
];

export async function GET(request) {
  try {
    // 1. Validasi autentikasi dan hak akses admin.
    const auth = await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    // 2. Ambil parameter URL.
    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const actionType = searchParams.get("actionType") || "all";

    // 3. Validasi halaman.
    if (
      !Number.isInteger(page) ||
      page < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor halaman tidak valid.",
        },
        { status: 400 }
      );
    }

    // 4. Validasi batas data per halaman.
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Limit harus berupa angka 1 sampai 50.",
        },
        { status: 400 }
      );
    }

    // 5. Validasi jenis aktivitas.
    if (!VALID_ACTION_TYPES.includes(actionType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Jenis aktivitas tidak valid.",
        },
        { status: 400 }
      );
    }

    // 6. Ambil data melalui service.
    const result = await getAdminActivityLogs(
      auth.supabase,
      {
        page,
        limit,
        actionType,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Riwayat aktivitas admin berhasil diambil.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Admin activity logs API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil riwayat aktivitas admin.",
      },
      { status: 500 }
    );
  }
} 