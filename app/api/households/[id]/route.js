import { requireApiUser } from "@/lib/auth/authorization";
import { apiSuccess, apiError, readJson, handleApiError } from "@/lib/api/response";
import { SUMBER_AIR_PROFIL } from "@/lib/sumberAir";

const SELECT = `household_id, owner_user_id, household_name, address_detail, province_id, city_regency_id, district_id, village, member_count, water_source_type, source_condition, tank_capacity_liters, water_volume_percentage, has_mhm, mhm_member_count, roof_area_m2, updated_at`;

function validateHousehold(body) {
  const errors = [];
  const household_name = String(body?.namaRumahTangga ?? body?.household_name ?? "").trim();
  const member_count = Number(body?.anggota ?? body?.member_count);
  const tank_capacity_liters = Number(body?.kapasitas ?? body?.tank_capacity_liters);
  const mhm = Boolean(body?.mhm ?? body?.has_mhm);
  const mhm_member_count = mhm ? Number(body?.anggotaMhm ?? body?.mhm_member_count ?? 0) : 0;
  const water_source_type = String(body?.sumberAir ?? body?.water_source_type ?? "").trim();
  const address_detail = String(body?.wilayahDesa ?? body?.address_detail ?? "").trim();
  const allowedSources = SUMBER_AIR_PROFIL;

  if (!household_name || household_name.length > 150) errors.push("Nama rumah tangga wajib diisi dan maksimal 150 karakter.");
  if (!Number.isInteger(member_count) || member_count < 1 || member_count > 30) errors.push("Jumlah anggota keluarga harus 1 sampai 30.");
  if (!Number.isFinite(tank_capacity_liters) || tank_capacity_liters < 0 || tank_capacity_liters > 100000) errors.push("Kapasitas tandon harus 0 sampai 100.000 liter.");
  if (!Number.isInteger(mhm_member_count) || mhm_member_count < 0 || mhm_member_count > member_count) errors.push("Jumlah anggota MHM tidak valid.");
  if (!allowedSources.includes(water_source_type)) errors.push("Sumber air utama tidak valid.");
  if (address_detail.length > 300) errors.push("Wilayah/alamat maksimal 300 karakter.");

  return { valid: errors.length === 0, errors, value: {
    household_name, member_count, tank_capacity_liters, has_mhm: mhm && mhm_member_count > 0,
    mhm_member_count, water_source_type, address_detail: address_detail || null, updated_at: new Date().toISOString(),
  }};
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const householdId = Number(id);
    if (!Number.isSafeInteger(householdId) || householdId <= 0) return apiError("ID rumah tangga tidak valid.", { status: 400, code: "INVALID_ID" });
    const { supabase, user } = await requireApiUser();
    const { data, error } = await supabase.from("households").select(SELECT).eq("household_id", householdId).eq("owner_user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) return apiError("Data rumah tangga tidak ditemukan.", { status: 404, code: "NOT_FOUND" });
    return apiSuccess(data, { message: "Detail rumah tangga berhasil diambil." });
  } catch (error) { return handleApiError(error, "Detail rumah tangga gagal dimuat."); }
}

export async function PATCH(request, { params }) {
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return apiError("Body JSON tidak valid.", { status: 400, code: "INVALID_JSON" });
  const validation = validateHousehold(body);
  if (!validation.valid) return apiError("Data rumah tangga belum valid.", { status: 422, code: "HOUSEHOLD_VALIDATION_FAILED", details: validation.errors });
  try {
    const { id } = await params;
    const householdId = Number(id);
    if (!Number.isSafeInteger(householdId) || householdId <= 0) return apiError("ID rumah tangga tidak valid.", { status: 400, code: "INVALID_ID" });
    const { supabase, user } = await requireApiUser();
    const { data, error } = await supabase.from("households").update(validation.value).eq("household_id", householdId).eq("owner_user_id", user.id).select(SELECT).maybeSingle();
    if (error) throw error;
    if (!data) return apiError("Data rumah tangga tidak ditemukan atau bukan milik akun ini.", { status: 404, code: "NOT_FOUND" });
    return apiSuccess(data, { message: "Data rumah tangga berhasil diperbarui." });
  } catch (error) { return handleApiError(error, "Data rumah tangga gagal diperbarui."); }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const householdId = Number(id);
    if (!Number.isSafeInteger(householdId) || householdId <= 0) return apiError("ID rumah tangga tidak valid.", { status: 400, code: "INVALID_ID" });
    const { supabase, user } = await requireApiUser();
    const { data: household, error: findError } = await supabase.from("households").select("household_id").eq("household_id", householdId).eq("owner_user_id", user.id).maybeSingle();
    if (findError) throw findError;
    if (!household) return apiError("Data rumah tangga tidak ditemukan.", { status: 404, code: "NOT_FOUND" });

    // FK pada schema saat ini tidak memakai ON DELETE CASCADE. Tolak penghapusan
    // jika ada data turunan agar riwayat asesmen/anggota/assistant tetap utuh.
    const checks = await Promise.all([
      supabase.from("household_members").select("member_id", { count: "exact", head: true }).eq("household_id", householdId),
      supabase.from("water_assessments").select("assessment_id", { count: "exact", head: true }).eq("household_id", householdId),
      supabase.from("assistant_interactions").select("interaction_id", { count: "exact", head: true }).eq("household_id", householdId),
    ]);
    const failed = checks.find((item) => item.error);
    if (failed) throw failed.error;
    if (checks.some((item) => (item.count || 0) > 0)) return apiError("Data keluarga tidak dapat dihapus karena masih memiliki anggota, riwayat kalkulator, atau interaksi Assistant terkait.", { status: 409, code: "HOUSEHOLD_HAS_DEPENDENCIES" });

    const { error } = await supabase.from("households").delete().eq("household_id", householdId).eq("owner_user_id", user.id);
    if (error) throw error;
    return apiSuccess({ household_id: householdId }, { message: "Data rumah tangga berhasil dihapus." });
  } catch (error) { return handleApiError(error, "Data rumah tangga gagal dihapus."); }
}
