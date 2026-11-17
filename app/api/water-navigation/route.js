import { getTitikAirPublikAction } from "@/app/actions/navigasi-air";
import { apiSuccess, apiError, handleApiError } from "@/lib/api/response";
import { parseNavigationFilters } from "@/lib/validation/navigation";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const filters = parseNavigationFilters(url.searchParams);
    const { limit, offset } = filters;
    const q = filters.q.toLocaleLowerCase("id-ID");
    const type = filters.type.toLocaleLowerCase("id-ID");
    const province = filters.province.toLocaleLowerCase("id-ID");
    const regency = filters.regency.toLocaleLowerCase("id-ID");
    const district = filters.district.toLocaleLowerCase("id-ID");
    const availableOnly = filters.availableOnly;

    // Action ini sudah membatasi hasil ke verified + active + non-simulation.
    const result = await getTitikAirPublikAction();
    if (!result?.success) {
      return apiError(result?.message || "Gagal mengambil titik air.", { status: 503, code: "WATER_POINTS_UNAVAILABLE" });
    }

    const filtered = (result.data || []).filter((point) => {
      const haystack = [point.name, point.address, point.area, point.kecamatan, point.kabupaten, point.provinsi, point.type]
        .filter(Boolean).join(" ").toLocaleLowerCase("id-ID");
      const typeMatch = !type || point.type.toLocaleLowerCase("id-ID").includes(type);
      const provinceMatch = !province || (point.provinsi || "").toLocaleLowerCase("id-ID").includes(province);
      const regencyMatch = !regency || (point.kabupaten || "").toLocaleLowerCase("id-ID").includes(regency);
      const districtMatch = !district || (point.kecamatan || "").toLocaleLowerCase("id-ID").includes(district);
      const availabilityMatch = !availableOnly || ["Tersedia", "Terbatas"].includes(point.availability);
      return (!q || haystack.includes(q)) && typeMatch && provinceMatch && regencyMatch && districtMatch && availabilityMatch;
    });

    return apiSuccess({
      items: filtered.slice(offset, offset + limit),
      wilayah: result.wilayah,
      pagination: { limit, offset, total: filtered.length, hasMore: offset + limit < filtered.length },
      filters: { q, type, province, regency, district, availableOnly },
    }, { message: "Titik air terverifikasi berhasil diambil." });
  } catch (error) {
    return handleApiError(error, "Daftar titik air gagal dimuat.");
  }
}
