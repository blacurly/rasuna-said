import {
  getAdminWaterPointContributions,
} from "@/services/contributionService";

import {
  requireApiAdmin,
} from "@/lib/auth/authorization";

import {
  apiSuccess,
  handleApiError,
  getPagination,
} from "@/lib/api/response";

export async function GET(request) {
  try {
    await requireApiAdmin();

    const url = new URL(request.url);

    const { limit, offset } = getPagination(
      url.searchParams,
      {
        defaultLimit: 25,
        maxLimit: 100,
      }
    );

    const status = (
      url.searchParams.get("status") || ""
    ).trim();

    const all =
      await getAdminWaterPointContributions();

    const filtered = status
      ? all.filter(
          (item) => item.reviewStatus === status
        )
      : all;

    return apiSuccess(
      {
        items: filtered.slice(
          offset,
          offset + limit
        ),

        pagination: {
          limit,
          offset,
          total: filtered.length,
          hasMore:
            offset + limit < filtered.length,
        },
      },
      {
        message:
          "Antrean kontribusi berhasil diambil.",
      }
    );
  } catch (error) {
    return handleApiError(
      error,
      "Antrean kontribusi admin gagal dimuat."
    );
  }
}
