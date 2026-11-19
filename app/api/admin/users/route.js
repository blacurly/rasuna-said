import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getAdminUsers } from "@/services/adminUserService";

/**
 * GET /api/admin/users
 *
 * Mengambil daftar pengguna untuk Admin Dashboard.
 *
 * Query parameters:
 * - page: nomor halaman
 * - limit: jumlah data per halaman
 * - search: pencarian nama atau email
 * - role: filter role (admin/user)
 * - accountStatus: filter status akun
 * - sortBy: kolom pengurutan
 * - sortOrder: asc/desc
 *
 * Hanya dapat diakses oleh admin aktif.
 */
export async function GET(request) {
  try {
    // 1. Validasi autentikasi dan otorisasi admin.
    const auth = await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    // 2. Ambil parameter dari URL.
    const { searchParams } = new URL(request.url);

    const page = searchParams.get("page") ?? 1;
    const limit = searchParams.get("limit") ?? 10;
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";
    const accountStatus =
      searchParams.get("accountStatus") ?? "";

    const sortBy = searchParams.get("sortBy") ?? "created_at";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";

    // 3. Validasi nilai filter.
    const allowedRoles = ["admin", "user"];

    const allowedStatuses = [
      "active",
      "inactive",
      "suspend",
    ];

    const allowedSortFields = [
      "created_at",
      "updated_at",
      "full_name",
      "email",
    ];

    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Filter role tidak valid.",
        },
        { status: 400 }
      );
    }

    if (
      accountStatus &&
      !allowedStatuses.includes(accountStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Filter status akun tidak valid.",
        },
        { status: 400 }
      );
    }

    if (!allowedSortFields.includes(sortBy)) {
      return NextResponse.json(
        {
          success: false,
          message: "Kolom pengurutan tidak valid.",
        },
        { status: 400 }
      );
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      return NextResponse.json(
        {
          success: false,
          message: "Urutan pengurutan tidak valid.",
        },
        { status: 400 }
      );
    }

    // 4. Validasi pagination.
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    if (
    !Number.isInteger(parsedPage) ||
    parsedPage < 1 ||
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Parameter pagination tidak valid.",
        },
        { status: 400 }
      );
    }

    // 5. Ambil daftar pengguna dari service.
    const result = await getAdminUsers({
      page: parsedPage,
      limit: parsedLimit,
      search,
      role,
      accountStatus,
      sortBy,
      sortOrder,
    });

    // 6. Kirim respons berhasil.
    return NextResponse.json(
      {
        success: true,
        message: "Daftar pengguna berhasil diambil.",
        data: result.users,
        pagination: result.pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/users]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil daftar pengguna.",
      },
      { status: 500 }
    );
  }
}