import { simpanProfilKeluargaUser } from "@/services/dashboardService";
import { apiSuccess, apiError, readJson, handleApiError } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";

const HOUSEHOLD_SELECT = `
  household_id,
  owner_user_id,
  household_name,
  address_detail,
  province_id,
  city_regency_id,
  district_id,
  member_count,
  water_source_type,
  source_condition,
  tank_capacity_liters,
  water_volume_percentage,
  has_mhm,
  mhm_member_count,
  roof_area_m2,
  updated_at,
  province:provinces!fk_household_province(province_id, province_name),
  city:city_regencies!fk_household_city(city_regency_id, city_regency_name),
  district:districts!fk_household_district(district_id, district_name)
`;

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();
    const { data, error } = await supabase
      .from("households")
      .select(HOUSEHOLD_SELECT)
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false })
      .order("household_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return apiSuccess(data, { message: data ? "Data keluarga berhasil diambil." : "Data keluarga belum diisi." });
  } catch (error) {
    return handleApiError(error, "Data keluarga gagal dimuat.");
  }
}

export async function POST(request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError("Body JSON tidak valid.", { status: 400, code: "INVALID_JSON" });
  }

  try {
    const { supabase, user } = await requireApiUser();

    // Menggunakan service yang sama dengan formulir Dashboard Kondisi Air.
    // Service memperbarui household milik user yang sedang login atau
    // membuat record pertama jika belum ada.
    const result = await simpanProfilKeluargaUser(body);
    if (!result?.ok) {
      const authError = /masuk terlebih dahulu/i.test(result?.error || "");
      return apiError(result?.error || "Data keluarga gagal disimpan.", {
        status: authError ? 401 : 422,
        code: authError ? "UNAUTHENTICATED" : "HOUSEHOLD_VALIDATION_FAILED",
      });
    }

    const { data, error } = await supabase
      .from("households")
      .select(HOUSEHOLD_SELECT)
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false })
      .order("household_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/kondisi-air");
    return apiSuccess(data, { status: 200, message: "Data keluarga berhasil disimpan." });
  } catch (error) {
    return handleApiError(error, "Data keluarga gagal disimpan.");
  }
}
