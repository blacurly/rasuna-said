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


// Batalkan kontribusi pending milik pengguna sendiri (tidak menghapus riwayat review).
export async function DELETE(_request, { params }) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return apiError("Silakan masuk terlebih dahulu.", { status: 401, code: "UNAUTHENTICATED" });

    const { id } = await params;
    const contributionId = Number(id);
    if (!Number.isSafeInteger(contributionId) || contributionId <= 0) {
      return apiError("ID kontribusi tidak valid.", { status: 400, code: "INVALID_ID" });
    }

    const { data: item, error: fetchError } = await supabase
      .from("water_point_contributions")
      .select("contribution_id, status, contributor_user_id")
      .eq("contribution_id", contributionId)
      .eq("contributor_user_id", user.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!item) return apiError("Kontribusi tidak ditemukan.", { status: 404, code: "NOT_FOUND" });
    if (item.status !== "pending") return apiError("Kontribusi hanya dapat dibatalkan saat menunggu verifikasi.", { status: 409, code: "NOT_PENDING" });

    const { count, error: reviewError } = await supabase
      .from("water_point_contribution_reviews")
      .select("review_id", { count: "exact", head: true })
      .eq("contribution_id", contributionId);
    if (reviewError) throw reviewError;
    if (count > 0) return apiError("Kontribusi ini memiliki riwayat review. Pembatalan belum dapat dilakukan agar jejak review tetap terjaga.", { status: 409, code: "HAS_REVIEW_HISTORY" });

    const { error: deleteError } = await supabase
      .from("water_point_contributions")
      .delete()
      .eq("contribution_id", contributionId)
      .eq("contributor_user_id", user.id)
      .eq("status", "pending");
    if (deleteError) throw deleteError;
    return apiSuccess({ contributionId }, { message: "Kontribusi berhasil dibatalkan." });
  } catch (error) {
    return handleApiError(error, "Kontribusi gagal dibatalkan.");
  }
}
