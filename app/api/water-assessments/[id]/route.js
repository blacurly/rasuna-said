import { requireApiUser } from "@/lib/auth/authorization";
import { apiSuccess, apiError, readJson, handleApiError } from "@/lib/api/response";

const ASSESSMENT_SELECT = `assessment_id, household_id, available_water_liters, daily_need_liters, estimated_duration_days, water_condition, crisis_mode, assessment_notes, assessed_at, input_snapshot, assessment_recommendations(recommendation_id, recommendation_title, recommendation_detail, priority, action_status)`;

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const assessmentId = Number(id);
    if (!Number.isSafeInteger(assessmentId) || assessmentId <= 0) return apiError("ID asesmen tidak valid.", { status: 400, code: "INVALID_ID" });
    const { supabase, user } = await requireApiUser();
    const { data, error } = await supabase.from("water_assessments").select(ASSESSMENT_SELECT).eq("assessment_id", assessmentId).eq("assessed_by_user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) return apiError("Riwayat asesmen tidak ditemukan.", { status: 404, code: "NOT_FOUND" });
    return apiSuccess(data, { message: "Detail asesmen berhasil diambil." });
  } catch (error) { return handleApiError(error, "Detail asesmen gagal dimuat."); }
}

export async function PATCH(request, { params }) {
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return apiError("Body JSON tidak valid.", { status: 400, code: "INVALID_JSON" });
  if (!Object.prototype.hasOwnProperty.call(body, "assessment_notes") || Object.keys(body).some((key) => key !== "assessment_notes") || (body.assessment_notes != null && (typeof body.assessment_notes !== "string" || body.assessment_notes.length > 2000))) {
    return apiError("Hanya catatan asesmen yang dapat diperbarui dan maksimal 2.000 karakter.", { status: 422, code: "ASSESSMENT_VALIDATION_FAILED" });
  }
  try {
    const { id } = await params;
    const assessmentId = Number(id);
    if (!Number.isSafeInteger(assessmentId) || assessmentId <= 0) return apiError("ID asesmen tidak valid.", { status: 400, code: "INVALID_ID" });
    const { supabase, user } = await requireApiUser();
    const { data, error } = await supabase.from("water_assessments").update({ assessment_notes: body.assessment_notes?.trim() || null }).eq("assessment_id", assessmentId).eq("assessed_by_user_id", user.id).select(ASSESSMENT_SELECT).maybeSingle();
    if (error) throw error;
    if (!data) return apiError("Riwayat asesmen tidak ditemukan.", { status: 404, code: "NOT_FOUND" });
    return apiSuccess(data, { message: "Catatan asesmen berhasil diperbarui." });
  } catch (error) { return handleApiError(error, "Catatan asesmen gagal diperbarui."); }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const assessmentId = Number(id);
    if (!Number.isSafeInteger(assessmentId) || assessmentId <= 0) return apiError("ID asesmen tidak valid.", { status: 400, code: "INVALID_ID" });
    const { supabase } = await requireApiUser();

    // RPC SECURITY DEFINER memeriksa auth.uid() dan menghapus data dependen
    // serta assessment dalam satu transaksi. Tidak memakai service-role client.
    const { data, error } = await supabase.rpc("delete_my_water_assessment", {
      p_assessment_id: assessmentId,
    });
    if (error) throw error;
    if (!data?.success) return apiError(data?.message || "Riwayat asesmen tidak dapat dihapus.", { status: 404, code: "NOT_FOUND" });
    return apiSuccess({ assessment_id: assessmentId }, { message: "Riwayat asesmen dan data terkait berhasil dihapus." });
  } catch (error) { return handleApiError(error, "Riwayat asesmen gagal dihapus."); }
}
