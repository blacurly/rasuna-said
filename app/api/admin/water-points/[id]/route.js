import { apiSuccess, handleApiError, readJson } from "@/lib/api/response";
import { getAdminWaterPoint, updateAdminWaterPoint, deactivateAdminWaterPoint } from "@/services/waterPointAdminService";

function validId(id) { return /^\d+$/.test(String(id)) && Number(id) > 0; }
export async function GET(_request, { params }) {
  try { const { id } = await params; if (!validId(id)) return handleApiError(Object.assign(new Error("ID titik air tidak valid."), { status: 400, code: "INVALID_ID" })); return apiSuccess(await getAdminWaterPoint(id), { message: "Detail titik air berhasil diambil." }); }
  catch (error) { return handleApiError(error, "Detail titik air admin gagal dimuat."); }
}
export async function PATCH(request, { params }) {
  try { const { id } = await params; if (!validId(id)) return handleApiError(Object.assign(new Error("ID titik air tidak valid."), { status: 400, code: "INVALID_ID" })); const body = await readJson(request); if (!body) return handleApiError(Object.assign(new Error("Body JSON tidak valid."), { status: 400, code: "INVALID_JSON" })); return apiSuccess(await updateAdminWaterPoint(id, body), { message: "Titik air berhasil diperbarui." }); }
  catch (error) { return handleApiError(error, "Titik air gagal diperbarui."); }
}
export async function DELETE(_request, { params }) {
  try { const { id } = await params; if (!validId(id)) return handleApiError(Object.assign(new Error("ID titik air tidak valid."), { status: 400, code: "INVALID_ID" })); return apiSuccess(await deactivateAdminWaterPoint(id), { message: "Titik air berhasil dinonaktifkan." }); }
  catch (error) { return handleApiError(error, "Titik air gagal dinonaktifkan."); }
}
