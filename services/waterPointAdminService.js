import { requireApiAdmin } from "@/lib/auth/authorization";
import { normalizeIndonesianPhone } from "@/lib/phone";

const SELECT_FIELDS = `water_point_id, point_name, water_source_type, description, province_id, city_regency_id, district_id, village, address_detail, latitude, longitude, availability_status, access_information, opening_hours, verification_status, is_active, last_status_checked_at, created_at, updated_at, quality_information, provider, contact_person, phone_number, location_hint, usage_purpose, information_source, is_simulation`;
const TYPES = new Set(["public_well", "spring", "storage_tank", "emergency_tank", "hydrant", "reservoir", "water_station", "other"]);
const AVAILABILITY = new Set(["available", "limited", "unavailable", "unknown"]);
const VERIFICATION = new Set(["verified", "pending", "needs_revision", "rejected"]);
const TEXT_FIELDS = {
  point_name: 200, description: 3000, village: 150, address_detail: 500,
  access_information: 2000, opening_hours: 500, quality_information: 2000,
  provider: 200, contact_person: 200, phone_number: 40, location_hint: 500,
  usage_purpose: 500, information_source: 1000,
};

function validatePayload(input, partial = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Object.assign(new Error("Body harus berupa objek JSON."), { status: 400, code: "INVALID_JSON" });
  const out = {};
  const errors = [];
  for (const [key, max] of Object.entries(TEXT_FIELDS)) {
    if (!(key in input)) { if (!partial && key === "point_name") errors.push("Nama titik air wajib diisi."); continue; }
    if (input[key] !== null && typeof input[key] !== "string") { errors.push(`${key} harus berupa teks.`); continue; }
    const value = input[key] == null ? null : input[key].trim();
    if (value && value.length > max) errors.push(`${key} maksimal ${max} karakter.`);
    else out[key] = value || null;
  }
  for (const key of ["province_id", "city_regency_id", "district_id"]) {
    if (!(key in input)) { if (!partial) errors.push(`${key} wajib diisi.`); continue; }
    const value = input[key];
    if (value === null && key === "district_id") { out[key] = null; continue; }
    if (!Number.isSafeInteger(Number(value)) || Number(value) <= 0) errors.push(`${key} harus berupa ID positif.`);
    else out[key] = Number(value);
  }
  if (!partial && !("point_name" in out)) errors.push("Nama titik air wajib diisi.");
  if ("water_source_type" in input) {
    if (!TYPES.has(input.water_source_type)) errors.push("Jenis sumber air tidak valid."); else out.water_source_type = input.water_source_type;
  } else if (!partial) errors.push("water_source_type wajib diisi.");
  if ("availability_status" in input) {
    if (!AVAILABILITY.has(input.availability_status)) errors.push("Status ketersediaan tidak valid."); else out.availability_status = input.availability_status;
  } else if (!partial) out.availability_status = "unknown";
  if ("verification_status" in input) {
    if (!VERIFICATION.has(input.verification_status)) errors.push("Status verifikasi tidak valid."); else out.verification_status = input.verification_status;
  }
  if ("is_active" in input) { if (typeof input.is_active !== "boolean") errors.push("is_active harus boolean."); else out.is_active = input.is_active; }
  if ("is_simulation" in input) { if (typeof input.is_simulation !== "boolean") errors.push("is_simulation harus boolean."); else out.is_simulation = input.is_simulation; }
  for (const key of ["latitude", "longitude"]) {
    if (!(key in input)) { if (!partial) errors.push(`${key} wajib diisi.`); continue; }
    const n = Number(input[key]);
    const bounds = key === "latitude" ? [-90, 90] : [-180, 180];
    if (!Number.isFinite(n) || n < bounds[0] || n > bounds[1]) errors.push(`${key} di luar rentang koordinat.`); else out[key] = n;
  }
  if (errors.length) throw Object.assign(new Error(errors.join(" ")), { status: 422, code: "VALIDATION_ERROR" });
  if (out.phone_number) out.phone_number = normalizeIndonesianPhone(out.phone_number) || out.phone_number;
  return out;
}

async function adminContext() { return requireApiAdmin(); }
export async function listAdminWaterPoints(searchParams) {
  const { supabase } = await adminContext();
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 25, 1), 100);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  let q = supabase.from("water_points").select(SELECT_FIELDS, { count: "exact" }).order("updated_at", { ascending: false }).range(offset, offset + limit - 1);
  const text = searchParams.get("q")?.trim();
  const verification = searchParams.get("verificationStatus");
  const availability = searchParams.get("availabilityStatus");
  const active = searchParams.get("isActive");
  if (text) q = q.ilike("point_name", `%${text}%`);
  if (verification && VERIFICATION.has(verification)) q = q.eq("verification_status", verification);
  if (availability && AVAILABILITY.has(availability)) q = q.eq("availability_status", availability);
  if (active === "true" || active === "false") q = q.eq("is_active", active === "true");
  const { data, error, count } = await q;
  if (error) throw error;
  return { items: data || [], pagination: { limit, offset, total: count ?? 0, hasMore: offset + limit < (count ?? 0) } };
}
export async function createAdminWaterPoint(input) {
  const { supabase, user } = await adminContext();
  const payload = validatePayload(input);
  payload.verification_status = "verified";
  payload.is_active = payload.is_active ?? true;
  payload.is_simulation = payload.is_simulation ?? false;
  payload.verified_by_user_id = user.id;
  const { data, error } = await supabase.from("water_points").insert(payload).select(SELECT_FIELDS).single();
  if (error) throw error;
  return data;
}
export async function getAdminWaterPoint(id) {
  const { supabase } = await adminContext();
  const { data, error } = await supabase.from("water_points").select(SELECT_FIELDS).eq("water_point_id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("Titik air tidak ditemukan."), { status: 404, code: "NOT_FOUND" });
  return data;
}
export async function updateAdminWaterPoint(id, input) {
  const { supabase, user } = await adminContext();
  const payload = validatePayload(input, true);
  if (!Object.keys(payload).length) throw Object.assign(new Error("Tidak ada data yang dapat diperbarui."), { status: 422, code: "EMPTY_UPDATE" });
  // Keep reviewer identity server-controlled when verification status is explicitly changed.
  if ("verification_status" in payload) payload.verified_by_user_id = user.id;
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from("water_points").update(payload).eq("water_point_id", id).select(SELECT_FIELDS).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("Titik air tidak ditemukan."), { status: 404, code: "NOT_FOUND" });
  return data;
}
export async function deleteAdminWaterPoint(id) {
  const { supabase } = await adminContext();
  const pointId = Number(id);
  if (!Number.isSafeInteger(pointId) || pointId <= 0) {
    throw Object.assign(new Error("ID titik air tidak valid."), { status: 400, code: "INVALID_ID" });
  }
  const { data, error } = await supabase
    .from("water_points")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("water_point_id", pointId)
    .select("water_point_id, point_name, is_active")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("Titik air tidak ditemukan."), { status: 404, code: "NOT_FOUND" });
  return { ...data, deactivated: true };
}
