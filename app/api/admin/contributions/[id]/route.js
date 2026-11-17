import { reviewWaterPointContribution } from "@/services/contributionService";
import { requireApiAdmin } from "@/lib/auth/authorization";
import { apiSuccess, apiError, readJson, handleApiError } from "@/lib/api/response";
import { revalidatePath } from "next/cache";

const VALID_STATUS = new Set(["approved", "rejected", "needs_revision"]);

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

    if (!VALID_STATUS.has(body.reviewStatus)) {
      return apiError("reviewStatus harus approved, rejected, atau needs_revision.", {
        status: 422, code: "VALIDATION_ERROR",
      });
    }

    const reviewNotes = body.reviewNotes == null ? null : String(body.reviewNotes).trim();
    if (reviewNotes && reviewNotes.length > 2000) {
      return apiError("Catatan verifikasi maksimal 2.000 karakter.", { status: 422, code: "VALIDATION_ERROR" });
    }

    const data = await reviewWaterPointContribution({ contributionId, reviewStatus: body.reviewStatus, reviewNotes });
    revalidatePath("/navigasi-air");
    revalidatePath("/admin/verifikasi");
    revalidatePath("/dashboard/kontribusi");

    return apiSuccess(data, { message: "Keputusan verifikasi berhasil disimpan." });
  } catch (error) {
    return handleApiError(error, "Keputusan verifikasi gagal disimpan.");
  }
}
