import { getAdminWaterPointContributions, reviewWaterPointContribution } from "@/services/contributionService";
import { requireApiAdmin } from "@/lib/auth/authorization";
import { apiSuccess, apiError, readJson, handleApiError } from "@/lib/api/response";

const REVIEW_STATUSES = new Set(["approved", "rejected", "needs_revision"]);
const AVAILABILITY_STATUSES = new Set(["available", "limited", "unavailable", "unknown"]);

export async function GET(_request, { params }) {
  try {
    await requireApiAdmin();
    const { id } = await params;
    const contributionId = Number(id);
    if (!Number.isSafeInteger(contributionId) || contributionId <= 0) {
      return apiError("ID kontribusi tidak valid.", { status: 400, code: "INVALID_ID" });
    }

    const items = await getAdminWaterPointContributions();
    const item = items.find((entry) => Number(entry.id) === contributionId);
    if (!item) return apiError("Kontribusi tidak ditemukan.", { status: 404, code: "NOT_FOUND" });

    return apiSuccess(item, { message: "Detail kontribusi berhasil diambil." });
  } catch (error) {
    return handleApiError(error, "Detail kontribusi gagal dimuat.");
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireApiAdmin();
    const { id } = await params;
    const contributionId = Number(id);
    if (!Number.isSafeInteger(contributionId) || contributionId <= 0) {
      return apiError("ID kontribusi tidak valid.", { status: 400, code: "INVALID_ID" });
    }

    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return apiError("Body JSON tidak valid.", { status: 400, code: "INVALID_JSON" });
    }

    const reviewStatus = body.reviewStatus;
    if (!REVIEW_STATUSES.has(reviewStatus)) {
      return apiError("Keputusan verifikasi tidak valid.", { status: 422, code: "INVALID_REVIEW_STATUS" });
    }

    const reviewNotes = body.reviewNotes == null ? null : String(body.reviewNotes).trim();
    if (reviewNotes && reviewNotes.length > 2000) {
      return apiError("Catatan admin maksimal 2.000 karakter.", { status: 422, code: "INVALID_REVIEW_NOTES" });
    }

    const availabilityStatus = body.availabilityStatus ?? null;
    if (reviewStatus === "approved" && !AVAILABILITY_STATUSES.has(availabilityStatus)) {
      return apiError("Status ketersediaan wajib dipilih sebelum menyetujui kontribusi.", { status: 422, code: "INVALID_AVAILABILITY_STATUS" });
    }
    if (availabilityStatus !== null && !AVAILABILITY_STATUSES.has(availabilityStatus)) {
      return apiError("Status ketersediaan tidak valid.", { status: 422, code: "INVALID_AVAILABILITY_STATUS" });
    }

    const data = await reviewWaterPointContribution({
      contributionId,
      reviewStatus,
      reviewNotes,
      availabilityStatus: reviewStatus === "approved" ? availabilityStatus : null,
    });

    return apiSuccess(data, { message: "Keputusan verifikasi berhasil disimpan." });
  } catch (error) {
    return handleApiError(error, "Keputusan verifikasi gagal disimpan.");
  }
}
