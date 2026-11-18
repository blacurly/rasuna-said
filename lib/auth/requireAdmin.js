import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Memastikan request API berasal dari admin
 * yang sudah login dan memiliki status akun aktif.
 *
 * Return:
 * - authorized: true  -> pengguna merupakan admin aktif
 * - authorized: false -> request ditolak
 */
export async function requireAdmin() {
  const supabase = await createClient();

  // 1. Periksa sesi autentikasi Supabase
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Sesi login tidak ditemukan. Silakan masuk kembali.",
        },
        { status: 401 }
      ),
    };
  }

  // 2. Ambil profil pengguna dari public.users
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("users")
    .select("user_id, full_name, email, role, account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  // 3. Tangani kegagalan query database
  if (profileError) {
    console.error("ADMIN AUTH PROFILE ERROR:", profileError.message);

    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Gagal memverifikasi hak akses pengguna.",
        },
        { status: 500 }
      ),
    };
  }

  // 4. Pastikan profil ditemukan
  if (!profile) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Profil pengguna tidak ditemukan.",
        },
        { status: 403 }
      ),
    };
  }

  // 5. Pastikan role adalah admin
  if (profile.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki izin untuk mengakses API admin.",
        },
        { status: 403 }
      ),
    };
  }

  // 6. Pastikan akun admin masih aktif
  if (profile.account_status !== "active") {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Akun admin tidak aktif.",
        },
        { status: 403 }
      ),
    };
  }

  // 7. Jika seluruh pemeriksaan berhasil
  return {
    authorized: true,
    supabase,
    user,
    profile,
    response: null,
  };
}