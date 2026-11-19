import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { normalizeIndonesianPhone } from "@/lib/phone";
import {
  susunInformasiWilayah,
  susunMetadataSumber,
} from "@/lib/waterPointLocation";

const KOLOM_TITIK_AIR = `
  water_point_id,
  point_name,
  water_source_type,
  description,
  province_id,
  city_regency_id,
  district_id,
  village,
  address_detail,
  latitude,
  longitude,
  availability_status,
  access_information,
  opening_hours,
  verification_status,
  is_active,
  last_status_checked_at,
  created_at,
  updated_at,
  quality_information,
  provider,
  contact_person,
  phone_number,
  location_hint,
  usage_purpose,
  information_source,
  is_simulation
`;

function labelJenisAir(value) {
  const labels = {
    public_well: "Sumur umum",
    water_station: "Titik distribusi air",
  };

  return labels[value] || value || "Jenis sumber air belum diketahui";
}

function labelKetersediaan(value) {
  const labels = {
    available: "Tersedia",
    limited: "Terbatas",
    unavailable: "Tidak Tersedia",
    unknown: "Belum Diketahui",
  };

  return labels[value] || value || "Belum Diketahui";
}

function labelVerifikasi(value) {
  const labels = {
    verified: "Terverifikasi",
    pending: "Menunggu Verifikasi",
    needs_revision: "Perlu Perbaikan",
    rejected: "Ditolak",
  };

  return labels[value] || value || "Belum diketahui";
}

function formatTanggal(value) {
  if (!value) return "Belum diketahui";

  const tanggal = new Date(value);

  if (Number.isNaN(tanggal.getTime())) {
    return "Belum diketahui";
  }

  return `Diperbarui ${tanggal.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  })} WIB`;
}


async function ambilDataWilayah(supabase) {
  const [provinsiResult, kabupatenResult, kecamatanResult] =
    await Promise.all([
      supabase
        .from("provinces")
        .select("province_id, province_name"),

      supabase
        .from("city_regencies")
        .select("city_regency_id, provinces_id, city_regency_name"),

      supabase
        .from("districts")
        .select(
          "district_id, province_id, city_regency_id, district_name"
        ),
    ]);

  if (provinsiResult.error) throw provinsiResult.error;
  if (kabupatenResult.error) throw kabupatenResult.error;
  if (kecamatanResult.error) throw kecamatanResult.error;

  return {
    provinsi: provinsiResult.data || [],
    kabupaten: kabupatenResult.data || [],
    kecamatan: kecamatanResult.data || [],
  };
}

function petakanTitikAir(titik, wilayah) {
  const provinsi = wilayah.provinsi.find(
    (item) => Number(item.province_id) === Number(titik.province_id)
  );

  const kabupaten = wilayah.kabupaten.find(
    (item) =>
      Number(item.city_regency_id) === Number(titik.city_regency_id)
  );

  const kecamatan = wilayah.kecamatan.find(
    (item) => Number(item.district_id) === Number(titik.district_id)
  );

  const lokasi = susunInformasiWilayah({
    village: titik.village,
    districtName: kecamatan?.district_name,
    regencyName: kabupaten?.city_regency_name,
    provinceName: provinsi?.province_name,
    addressDetail: titik.address_detail,
  });

  const sumber = susunMetadataSumber({
    informationSource: titik.information_source,
    description: titik.description,
  });

  return {
    id: String(titik.water_point_id),
    waterPointId: titik.water_point_id,

    name: titik.point_name,
    type: labelJenisAir(titik.water_source_type),

    area: [lokasi.district, lokasi.regency]
      .filter(Boolean)
      .join(", "),

    address: lokasi.address,
    addressDetail: lokasi.addressDetail,
    village: lokasi.village,
    kecamatan: lokasi.district,
    kabupaten: lokasi.regency,
    provinsi: lokasi.province,
    country: "Indonesia",
    hasAdministrativeData: lokasi.hasAdministrativeData,

    latitude: titik.latitude,
    longitude: titik.longitude,

    availability: labelKetersediaan(titik.availability_status),
    verification: labelVerifikasi(titik.verification_status),

    updated: formatTanggal(
      titik.last_status_checked_at || titik.updated_at
    ),
    updatedAt: titik.last_status_checked_at || titik.updated_at,

    hours: titik.opening_hours || "",
    access: titik.access_information || "",
    quality: titik.quality_information || "",

    provider: titik.provider || "",
    contact: titik.contact_person || "",
    phone: normalizeIndonesianPhone(titik.phone_number) || "",

    locationHint: titik.location_hint || "",
    usagePurpose: titik.usage_purpose || "",
    source: sumber.sourceLabel,
    sourceMetadata: sumber.metadata,
    note: sumber.note,

    isSimulation: Boolean(titik.is_simulation),
    isActive: titik.is_active,
  };
}

// Daftar titik air terverifikasi untuk Dashboard Admin.
export const ambilTitikAirTerverifikasi = cache(async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("water_points")
    .select(KOLOM_TITIK_AIR)
    .eq("verification_status", "verified")
    .eq("is_active", true)
    .order("point_name", { ascending: true });

  if (error) {
    console.error("Gagal mengambil titik air terverifikasi:", error);
    throw new Error("Gagal mengambil data titik air terverifikasi.");
  }

  if (!data || data.length === 0) {
    return [];
  }

  const wilayah = await ambilDataWilayah(supabase);

  return data.map((titik) => petakanTitikAir(titik, wilayah));
});
