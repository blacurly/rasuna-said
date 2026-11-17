import { requireApiUser } from "@/lib/auth/authorization";
import { apiSuccess, apiError, handleApiError } from "@/lib/api/response";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const assessmentId = Number(id);
    if (!Number.isSafeInteger(assessmentId) || assessmentId <= 0) {
      return apiError("ID asesmen tidak valid.", { status: 400, code: "INVALID_ID" });
    }

    const { supabase, user } = await requireApiUser();
    const { data, error } = await supabase
      .from("water_assessments")
      .select(`
        assessment_id,
        household_id,
        available_water_liters,
        daily_need_liters,
        estimated_duration_days,
        water_condition,
        crisis_mode,
        assessment_notes,
        assessed_at,
        input_snapshot,
        assessment_recommendations (
          recommendation_id,
          recommendation_title,
          recommendation_detail,
          priority,
          action_status
        )
      `)
      .eq("assessment_id", assessmentId)
      .eq("assessed_by_user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return apiError("Riwayat asesmen tidak ditemukan.", { status: 404, code: "NOT_FOUND" });

    return apiSuccess(data, { message: "Detail asesmen berhasil diambil." });
  } catch (error) {
    return handleApiError(error, "Detail asesmen gagal dimuat.");
  }
}
