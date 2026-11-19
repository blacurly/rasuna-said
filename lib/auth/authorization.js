import { createClient } from "@/lib/supabase/server";

export class ApiAuthError extends Error {
  constructor(message, status = 401, code = "UNAUTHENTICATED") {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
    this.code = code;
  }
}

export async function getApiContext({ requireActive = true } = {}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ApiAuthError("Silakan masuk terlebih dahulu.", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("user_id, role, account_status, full_name, email, phone_number")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[AIRA Auth] Gagal membaca profil:", profileError);
    throw new ApiAuthError("Profil akun tidak dapat diverifikasi.", 503, "PROFILE_LOOKUP_FAILED");
  }

  if (!profile) {
    throw new ApiAuthError("Profil pengguna tidak ditemukan.", 403, "PROFILE_NOT_FOUND");
  }

  if (requireActive && profile.account_status !== "active") {
    throw new ApiAuthError("Akun tidak aktif.", 403, "ACCOUNT_INACTIVE");
  }

  return { supabase, user, profile };
}

export async function requireApiUser() {
  const context = await getApiContext();
  if (context.profile.role !== "user" && context.profile.role !== "admin") {
    throw new ApiAuthError("Role akun tidak memiliki akses.", 403, "ROLE_FORBIDDEN");
  }
  return context;
}

export async function requireApiAdmin() {
  const context = await getApiContext();

  if (context.profile.role !== "admin") {
    throw new ApiAuthError("Akses khusus admin AIRA.", 403, "ADMIN_REQUIRED");
  }

  // Pemeriksaan database tetap dilakukan; sama dengan mekanisme yang dipakai
  // contributionService dan kebijakan keamanan AIRA.
  const { data: isAdmin, error } = await context.supabase.rpc("is_aira_admin");
  if (error) {
    console.error("[AIRA Auth] RPC is_aira_admin gagal:", error);
    throw new ApiAuthError("Hak akses admin belum dapat diverifikasi.", 503, "ADMIN_CHECK_FAILED");
  }
  if (isAdmin !== true) {
    throw new ApiAuthError("Akses khusus admin AIRA.", 403, "ADMIN_REQUIRED");
  }

  return context;
}