import { getDetailTitikAirAction } from "@/app/actions/navigasi-air";
import { apiSuccess, apiError, handleApiError } from "@/lib/api/response";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await getDetailTitikAirAction(id);
    if (!result?.success) {
      const notFound = /tidak ditemukan|belum tersedia/i.test(result?.message || "");
      return apiError(result?.message || "Detail titik air gagal dimuat.", {
        status: notFound ? 404 : 400,
        code: notFound ? "NOT_FOUND" : "WATER_POINT_LOOKUP_FAILED",
      });
    }
    return apiSuccess(result.data, { message: "Detail titik air berhasil diambil." });
  } catch (error) {
    return handleApiError(error, "Detail titik air gagal dimuat.");
  }
}
