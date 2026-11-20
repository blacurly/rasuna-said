import { apiSuccess, handleApiError, readJson } from "@/lib/api/response";
import { listAdminWaterPoints, createAdminWaterPoint } from "@/services/waterPointAdminService";

export async function GET(request) {
  try {
    const data = await listAdminWaterPoints(new URL(request.url).searchParams);
    return apiSuccess(data, { message: "Data titik air admin berhasil diambil." });
  } catch (error) { return handleApiError(error, "Daftar titik air admin gagal dimuat."); }
}
export async function POST(request) {
  try {
    const body = await readJson(request);
    if (!body) return handleApiError(Object.assign(new Error("Body JSON tidak valid."), { status: 400, code: "INVALID_JSON" }));
    const data = await createAdminWaterPoint(body);
    return apiSuccess(data, { status: 201, message: "Titik air berhasil ditambahkan." });
  } catch (error) { return handleApiError(error, "Titik air gagal ditambahkan."); }
}
