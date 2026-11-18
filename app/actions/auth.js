"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// ==========================================
// HELPER
// ==========================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[\s-]/g, "");
}

function isValidPhone(phone) {
  const normalizedPhone = normalizePhone(phone);
  return /^(\+62|62|0)[0-9]{8,13}$/.test(normalizedPhone);
}

function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "https://aira-for-every-woman.vercel.app";
  }

  return "http://localhost:3000";
}

// Alamat situs dari request yang sedang berjalan (production, preview, atau local).
// Cadangannya getSiteUrl(). Supabase tetap memvalidasi redirectTo terhadap daftar Redirect URLs.
async function getRequestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");

  if (!host) return getSiteUrl();

  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() ?? (isLocal ? "http" : "https");

  return `${proto}://${host}`;
}

function createCallbackUrl(nextPath) {
  const callbackUrl = new URL(
    "/auth/callback",
    getSiteUrl()
  );

  callbackUrl.searchParams.set("next", nextPath);

  return callbackUrl.toString();
}

// ==========================================
// REGISTER
// ==========================================

export async function register(formData) {
  const fullName = String(
    formData.get("full_name") || ""
  ).trim();

  const email = String(
    formData.get("email") || ""
  ).trim().toLowerCase();

  const phoneNumber = normalizePhone(
    formData.get("phone_number")
  );

  const password = String(
    formData.get("password") || ""
  );

  const confirmPassword = String(
    formData.get("confirm_password") || ""
  );

  const agreement = formData.get("agreement");

  // VALIDASI NAMA
  if (!fullName) {
    return {
      error: "Nama lengkap wajib diisi.",
    };
  }

  if (fullName.length < 3) {
    return {
      error: "Nama lengkap minimal 3 karakter.",
    };
  }

  if (fullName.length > 150) {
    return {
      error: "Nama lengkap maksimal 150 karakter.",
    };
  }

  // VALIDASI EMAIL
  if (!email || !isValidEmail(email)) {
    return {
      error: "Format email tidak valid.",
    };
  }

  // VALIDASI NOMOR WHATSAPP
  if (!phoneNumber || !isValidPhone(phoneNumber)) {
    return {
      error: "Nomor WhatsApp tidak valid.",
    };
  }

  // VALIDASI PASSWORD
  if (password.length < 8) {
    return {
      error: "Password minimal 8 karakter.",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Konfirmasi password tidak sesuai.",
    };
  }

  // VALIDASI PERSETUJUAN
  if (agreement !== "on" && agreement !== true) {
    return {
      error: "Persetujuan wajib dicentang.",
    };
  }

  const supabase = await createClient();

  const emailRedirectTo = createCallbackUrl(
    "/masuk?verified=1"
  );

  // REGISTRASI SUPABASE
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone_number: phoneNumber,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    console.error("REGISTER ERROR:", {
      message: error.message,
      code: error.code,
      status: error.status,
    });

    return {
      error:
        "Pendaftaran gagal. Periksa kembali data atau email kamu.",
    };
  }

  // CEK EMAIL YANG SUDAH TERDAFTAR
  if (
    data.user &&
    data.user.identities &&
    data.user.identities.length === 0
  ) {
    return {
      error: "Email sudah terdaftar. Silakan masuk.",
    };
  }

  // JIKA KONFIRMASI EMAIL AKTIF
  if (!data.session) {
    return {
      success:
        "Pendaftaran berhasil. Silakan periksa email untuk mengonfirmasi akun AIRA.",
    };
  }

  // JIKA KONFIRMASI EMAIL TIDAK DIWAJIBKAN
  redirect("/dashboard");
}

// ==========================================
// LOGIN
// ==========================================

export async function login(formData) {
  const email = String(
    formData.get("email") || ""
  ).trim().toLowerCase();

  const password = String(
    formData.get("password") || ""
  );

  if (!email || !password) {
    return {
      error: "Email dan password wajib diisi.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: "Format email tidak valid.",
    };
  }

  const supabase = await createClient();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // PEMERIKSAAN AUTENTIKASI
  if (authError || !authData?.user) {
    console.error("LOGIN AUTH ERROR:", {
      message: authError?.message,
      code: authError?.code,
      status: authError?.status,
    });

    if (authError?.code === "email_not_confirmed") {
      return {
        error:
          "Email belum dikonfirmasi. Silakan periksa email kamu dan lakukan konfirmasi terlebih dahulu.",
      };
    }

    if (
      authError?.status === 429 ||
      authError?.code === "over_request_rate_limit"
    ) {
      return {
        error:
          "Terlalu banyak percobaan login. Silakan tunggu beberapa saat sebelum mencoba kembali.",
      };
    }

    if (authError?.code === "invalid_credentials") {
      return {
        error:
          "Email atau password yang kamu masukkan salah. Periksa kembali data login kamu.",
      };
    }

    return {
      error:
        "Login gagal karena terjadi masalah autentikasi. Silakan coba kembali.",
    };
  }

  // PEMERIKSAAN PROFIL PENGGUNA
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("users")
    .select(
      "user_id, full_name, email, phone_number, role, account_status"
    )
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("LOGIN PROFILE ERROR:", {
      message: profileError.message,
      code: profileError.code,
    });

    await supabase.auth.signOut();

    return {
      error:
        "Gagal mengambil data profil akun. Silakan coba kembali atau hubungi administrator AIRA.",
    };
  }

  if (!profile) {
    console.error(
      "LOGIN PROFILE NOT FOUND:",
      authData.user.id
    );

    await supabase.auth.signOut();

    return {
      error:
        "Profil pengguna tidak ditemukan. Silakan hubungi administrator AIRA.",
    };
  }

  // PEMERIKSAAN STATUS AKUN
  if (profile.account_status !== "active") {
    await supabase.auth.signOut();

    return {
      error:
        "Akun Anda tidak aktif. Silakan hubungi administrator AIRA.",
    };
  }

  // PENGALIHAN BERDASARKAN ROLE
  if (profile.role === "admin") {
    redirect("/admin");
  }

  if (profile.role === "user") {
    redirect("/dashboard");
  }

  await supabase.auth.signOut();

  return {
    error:
      "Role akun tidak dikenali. Silakan hubungi administrator AIRA.",
  };
}

// ==========================================
// LOGOUT
// ==========================================

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("LOGOUT ERROR:", error.message);
  }

  redirect("/masuk");
}

// ==========================================
// RESET / LUPA PASSWORD
// ==========================================

export async function resetPassword(formData) {
  const email = String(
    formData.get("email") || ""
  ).trim().toLowerCase();

  if (!email) {
    return {
      error: "Email wajib diisi.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: "Format email tidak valid.",
    };
  }

  const supabase = await createClient();

  // Tautan di email mengarah langsung ke halaman reset password (bukan /auth/callback),
  // sehingga pengguna tidak pernah mendapat sesi login sebelum sandinya diganti.
  // Template email "Reset Password" di Supabase memakai {{ .RedirectTo }}?token_hash=...
  const redirectTo = `${await getRequestOrigin()}/masuk/reset-password`;

  const { error } =
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

  if (error) {
    console.error("RESET PASSWORD ERROR:", {
      message: error.message,
      code: error.code,
      status: error.status,
    });

    return {
      error:
        "Permintaan reset password gagal. Silakan coba kembali.",
    };
  }

  return {
    success:
      "Jika email terdaftar, tautan reset password akan dikirim. Silakan periksa kotak masuk email kamu.",
  };
}

// ==========================================
// UPDATE PASSWORD
// ==========================================

export async function updatePassword(formData) {
  const password = String(
    formData.get("password") || ""
  );

  const confirmPassword = String(
    formData.get("confirm_password") || ""
  );

  // Token dari tautan email. Tanpa token berarti tautan lama (PKCE) yang sudah membuat
  // sesi pemulihan; jalur itu dipertahankan agar email yang sudah terkirim tetap berfungsi.
  const tokenHash = String(
    formData.get("token_hash") || ""
  ).trim();

  if (password.length < 8) {
    return {
      error: "Password baru minimal 8 karakter.",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Konfirmasi password tidak sesuai.",
    };
  }

  const supabase = await createClient();

  if (tokenHash) {
    // Sesi dibuat di sini, tepat sebelum sandi diganti, lalu langsung diakhiri di bawah.
    const { error: otpError } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });

    if (otpError) {
      console.error("VERIFY RECOVERY ERROR:", {
        message: otpError.message,
        code: otpError.code,
        status: otpError.status,
      });

      return {
        error:
          "Tautan reset password tidak valid, sudah kedaluwarsa, atau sudah pernah digunakan. Silakan minta tautan baru.",
      };
    }
  }

  // PASTIKAN SESSION PEMULIHAN TERSEDIA
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error:
        "Sesi pemulihan tidak ditemukan atau sudah kedaluwarsa. Silakan minta tautan reset baru.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error("UPDATE PASSWORD ERROR:", {
      message: error.message,
      code: error.code,
      status: error.status,
    });

    if (tokenHash) {
      // Token sudah terpakai oleh verifyOtp, jadi jangan tinggalkan sesi login.
      await supabase.auth.signOut();

      const sebab =
        error.code === "same_password"
          ? "Password baru tidak boleh sama dengan password lama."
          : error.code === "weak_password"
            ? "Password terlalu lemah."
            : "Password gagal diperbarui.";

      return {
        error: `${sebab} Tautan ini sudah terpakai, silakan minta tautan reset baru.`,
      };
    }

    return {
      error:
        "Password gagal diperbarui. Silakan coba kembali.",
    };
  }

  // Akhiri sesi: pengguna harus masuk lagi dengan email dan password baru.
  await supabase.auth.signOut();

  return {
    success:
      "Password berhasil diperbarui. Silakan masuk kembali.",
  };
}