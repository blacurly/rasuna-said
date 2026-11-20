import { requireApiUser } from "@/lib/auth/authorization";
import { apiSuccess, apiError, readJson, handleApiError } from "@/lib/api/response";

const ASSESSMENT_SELECT = `assessment_id, household_id, available_water_liters, daily_need_liters, estimated_duration_days, water_condition, crisis_mode, assessment_notes, assessed_at, input_snapshot, assessment_recommendations(recommendation_id, recommendation_title, recommendation_detail, priority, action_status)`;

async function ownedAssessment(supabase, userId, assessmentId) {
  return supabase.from("water_assessments").select("assessment_id").eq("assessment_id", assessmentId).eq("assessed_by_user_id", userId).maybeSingle();
}

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
    const { supabase, user } = await requireApiUser();
    const { data: assessment, error: findError } = await ownedAssessment(supabase, user.id, assessmentId);
    if (findError) throw findError;
    if (!assessment) return apiError("Riwayat asesmen tidak ditemukan.", { status: 404, code: "NOT_FOUND" });
    const checks = await Promise.all([
      supabase.from("assessment_recommendations").select("recommendation_id", { count: "exact", head: true }).eq("assessment_id", assessmentId),
      supabase.from("assistant_interactions").select("interaction_id", { count: "exact", head: true }).eq("assessment_id", assessmentId),
    ]);
    const failed = checks.find((item) => item.error);
    if (failed) throw failed.error;
    if (checks.some((item) => (item.count || 0) > 0)) return apiError("Riwayat tidak dapat dihapus karena sudah memiliki rekomendasi atau interaksi Assistant terkait.", { status: 409, code: "ASSESSMENT_HAS_DEPENDENCIES" });
    const { error } = await supabase.from("water_assessments").delete().eq("assessment_id", assessmentId).eq("assessed_by_user_id", user.id);
    if (error) throw error;
    return apiSuccess({ assessment_id: assessmentId }, { message: "Riwayat asesmen berhasil dihapus." });
  } catch (error) { return handleApiError(error, "Riwayat asesmen gagal dihapus."); }
}
