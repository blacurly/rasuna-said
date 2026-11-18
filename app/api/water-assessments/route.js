import { hitungKalkulator } from "@/app/actions/kalkulator";
import { apiSuccess, apiError, readJson, handleApiError, getPagination } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/authorization";
import { validateWaterAssessmentPayload } from "@/lib/validation/waterAssessment";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError("Body JSON tidak valid.", { status: 400, code: "INVALID_JSON" });
  }

  const validation = validateWaterAssessmentPayload(body);
  if (!validation.valid) {
    return apiError("Data kalkulator belum valid.", {
      status: 422,
      code: "CALCULATION_VALIDATION_FAILED",
      details: validation.errors,
    });
  }

  try {
    // Endpoint API mandiri: kalkulasi dan penyimpanan server-side.
    // Form halaman web memakai jalur RPC household tersendiri dan menonaktifkan
    // penyimpanan assessment dari Server Action agar tidak terjadi double insert.
    const result = await hitungKalkulator(body);

    if (!result?.valid) {
      return apiError("Data kalkulator belum valid.", {
        status: 422,
        code: "CALCULATION_VALIDATION_FAILED",
        details: result?.errors || result?.pesan || null,
      });
    }

    return apiSuccess(result, {
      status: result?.penyimpanan?.saved ? 201 : 200,
      message: result?.penyimpanan?.saved
        ? "Perhitungan berhasil dan riwayat tersimpan."
        : "Perhitungan berhasil. Riwayat tidak disimpan karena pengguna belum masuk atau penyimpanan tidak tersedia.",
    });
  } catch (error) {
    return handleApiError(error, "Perhitungan ketahanan air gagal diproses.");
  }
}

export async function GET(request) {
  try {
    const { supabase, user } = await requireApiUser();
    const { limit, offset } = getPagination(new URL(request.url).searchParams, { defaultLimit: 20, maxLimit: 100 });

    const { data, error, count } = await supabase
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
      `, { count: "exact" })
      .eq("assessed_by_user_id", user.id)
      .order("assessed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return apiSuccess({
      items: data || [],
      pagination: { limit, offset, total: count || 0, hasMore: offset + (data?.length || 0) < (count || 0) },
    }, { message: "Riwayat kalkulator berhasil diambil." });
  } catch (error) {
    return handleApiError(error, "Riwayat kalkulator gagal dimuat.");
  }
}
