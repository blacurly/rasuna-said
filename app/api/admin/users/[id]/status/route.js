import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { updateAdminUserStatus } from "@/services/adminUserService";

const VALID_STATUSES = ["active", "inactive", "suspend"];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request, { params }) {
  try {
    // 1. Periksa autentikasi dan hak akses admin.
    const auth = await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    // 2. Ambil dan validasi ID pengguna dari URL.
    const { id } = await params;

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format ID pengguna tidak valid.",
        },
        { status: 400 }
      );
    }

    // 3. Baca data request.
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format request JSON tidak valid.",
        },
        { status: 400 }
      );
    }

    const { account_status } = body ?? {};

    // 4. Validasi status akun.
    if (!VALID_STATUSES.includes(account_status)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Status akun tidak valid. Gunakan active, inactive, atau suspend.",
        },
        { status: 400 }
      );
    }

    // 5. Jalankan perubahan status melalui PostgreSQL RPC.
    const result = await updateAdminUserStatus(id, account_status);

    return NextResponse.json(
      {
        success: true,
        message: result.message || "Status akun berhasil diperbarui.",
        data: {
          user_id: result.user_id,
          previous_status: result.previous_status,
          account_status: result.account_status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /api/admin/users/[id]/status:", error);

    // 6. Petakan error dari PostgreSQL ke HTTP response.
    const errorCode = error?.code;

    if (errorCode === "28000") {
      return NextResponse.json(
        {
          success: false,
          message: "Sesi login tidak ditemukan.",
        },
        { status: 401 }
      );
    }

    if (errorCode === "42501") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Anda tidak memiliki izin untuk melakukan perubahan ini.",
        },
        { status: 403 }
      );
    }

    if (errorCode === "22023") {
      return NextResponse.json(
        {
          success: false,
          message: "Status akun yang diminta tidak valid.",
        },
        { status: 400 }
      );
    }

    if (errorCode === "P0002") {
      return NextResponse.json(
        {
          success: false,
          message: "Pengguna yang ingin diubah tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat memperbarui status akun.",
      },
      { status: 500 }
    );
  }
} 