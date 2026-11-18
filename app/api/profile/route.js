import { apiSuccess, handleApiError } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/authorization";

/**
 * GET /api/profile
 * Mengambil profil milik pengguna yang sedang login.
 * Identitas pengguna selalu berasal dari sesi Supabase, bukan parameter URL.
 */
export async function GET() {
  try {
    const { user, profile } = await requireApiUser();

    const data = {
      user_id: profile.user_id,
      full_name: profile.full_name || "",
      email: profile.email || user.email || "",
      role: profile.role,
      account_status: profile.account_status,
      phone_number: profile.phone_number || "",
      language: "id",
    };

    return apiSuccess(data, { message: "Profil pengguna berhasil diambil." });
  } catch (error) {
    return handleApiError(error, "Profil pengguna gagal dimuat.");
  }
}