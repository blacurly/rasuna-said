import { requireApiAdmin } from "@/lib/auth/authorization";
import { apiSuccess, apiError, readJson, handleApiError } from "@/lib/api/response";
import { updateAdminUserStatus } from "@/services/adminUserService";

const VALID_STATUSES = new Set(["active", "inactive", "suspend"]);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request, { params }) {
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError("Body JSON tidak valid.", { status: 400, code: "INVALID_JSON" });
  }
  if (Object.keys(body).length !== 1 || !VALID_STATUSES.has(body.account_status)) {
    return apiError("Status akun harus active, inactive, atau suspend.", { status: 422, code: "INVALID_ACCOUNT_STATUS" });
  }

  try {
    await requireApiAdmin();
    const { id } = await params;
    if (!UUID_REGEX.test(String(id || ""))) return apiError("Format ID pengguna tidak valid.", { status: 400, code: "INVALID_USER_ID" });
    const result = await updateAdminUserStatus(id, body.account_status);
    return apiSuccess({
      user_id: result.user_id,
      previous_status: result.previous_status,
      account_status: result.account_status,
    }, { message: result.message || "Status akun berhasil diperbarui." });
  } catch (error) {
    const mapped = {
      "28000": [401, "UNAUTHENTICATED", "Sesi login tidak ditemukan."],
      "42501": [403, "FORBIDDEN", "Anda tidak memiliki izin untuk melakukan perubahan ini."],
      "22023": [422, "INVALID_ACCOUNT_STATUS", "Status akun yang diminta tidak valid."],
      "P0002": [404, "USER_NOT_FOUND", "Pengguna yang ingin diubah tidak ditemukan."],
    }[error?.code];
    if (mapped) Object.assign(error, { status: mapped[0], code: mapped[1], message: mapped[2] });
    return handleApiError(error, "Terjadi kesalahan saat memperbarui status akun.");
  }
}
