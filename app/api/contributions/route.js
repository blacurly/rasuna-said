import { getMyWaterPointContributions, submitWaterPointContribution } from "@/services/contributionService";
import { apiSuccess, apiError, readJson, handleApiError, getPagination } from "@/lib/api/response";
import { validateContributionPayload } from "@/lib/validation/contribution";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError("Body JSON tidak valid.", { status: 400, code: "INVALID_JSON" });
  }

  const validation = validateContributionPayload(body);
  if (!validation.valid) {
    return apiError("Data kontribusi belum valid.", {
      status: 422,
      code: "CONTRIBUTION_VALIDATION_FAILED",
      details: validation.errors,
    });
  }

  try {
    // Kontribusi disimpan sebagai usulan; tidak pernah langsung membuat
    // atau mengubah water_points yang tampil ke publik.
    const data = await submitWaterPointContribution(body);
    return apiSuccess(data, { status: 201, message: "Kontribusi terkirim dan menunggu verifikasi admin." });
  } catch (error) {
    const auth = /masuk terlebih dahulu/i.test(error?.message || "");
    if (auth) Object.assign(error, { status: 401, code: "UNAUTHENTICATED" });
    return handleApiError(error, "Kontribusi gagal dikirim.");
  }
}

export async function GET(request) {
  try {
    const items = await getMyWaterPointContributions();
    const { limit, offset } = getPagination(new URL(request.url).searchParams, { defaultLimit: 20, maxLimit: 100 });
    return apiSuccess({
      items: items.slice(offset, offset + limit),
      pagination: { limit, offset, total: items.length, hasMore: offset + limit < items.length },
    }, { message: "Riwayat kontribusi berhasil diambil." });
  } catch (error) {
    const auth = /masuk terlebih dahulu/i.test(error?.message || "");
    return handleApiError(Object.assign(error, auth ? { status: 401, code: "UNAUTHENTICATED" } : {}), "Riwayat kontribusi gagal dimuat.");
  }
}
