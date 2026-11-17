import {
  formatNamaKabupaten,
  formatNamaKecamatan,
  formatNamaProvinsi,
} from "@/lib/formatWilayah";

function teksBersih(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,{2,}/g, ",")
    .trim()
    .replace(/^,+|,+$/g, "");
}

function kapitalisasiDesa(value = "") {
  const teks = teksBersih(value);
  if (!teks) return "";

  // Pertahankan singkatan huruf kapital yang memang ada di nama.
  if (teks === teks.toUpperCase() && /[A-Z]/.test(teks)) {
    return teks.toLowerCase().replace(/\b\p{L}/gu, (huruf) =>
      huruf.toUpperCase()
    );
  }

  return teks;
}

function normalisasiUntukBanding(value = "") {
  return teksBersih(value)
    .toLocaleLowerCase("id-ID")
    .replace(/[.,]/g, "")
    .replace(/^(desa|kelurahan|kecamatan|kabupaten|kota|provinsi)\s+/i, "")
    .trim();
}

function alamatDetailTambahan(addressDetail, wilayah) {
  const detail = teksBersih(addressDetail);
  if (!detail) return "";

  const komponenWilayah = [
    wilayah.village,
    wilayah.district,
    wilayah.regency,
    wilayah.province,
    "Indonesia",
  ]
    .filter(Boolean)
    .map(normalisasiUntukBanding);

  const bagian = detail
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const bagianTambahan = bagian.filter((item) => {
    const normalized = normalisasiUntukBanding(item);

    return !komponenWilayah.some(
      (komponen) =>
        normalized === komponen ||
        normalized.includes(komponen) ||
        komponen.includes(normalized)
    );
  });

  // Pertahankan alamat jalan/keterangan lain, tetapi buang komponen
  // administratif yang sudah ditampilkan dari kolom wilayah tersendiri.
  return bagianTambahan.join(", ");
}

export function susunInformasiWilayah({
  village,
  districtName,
  regencyName,
  provinceName,
  addressDetail,
}) {
  const wilayah = {
    village: kapitalisasiDesa(village),
    district: formatNamaKecamatan(districtName || ""),
    regency: formatNamaKabupaten(regencyName || ""),
    province: formatNamaProvinsi(provinceName || ""),
  };

  const addressDetailClean = alamatDetailTambahan(
    addressDetail,
    wilayah
  );

  const address = [
    addressDetailClean,
    wilayah.village,
    wilayah.district,
    wilayah.regency,
    wilayah.province,
    "Indonesia",
  ]
    .filter(Boolean)
    .filter((item, index, array) => {
      const current = normalisasiUntukBanding(item);
      return (
        array.findIndex(
          (candidate) => normalisasiUntukBanding(candidate) === current
        ) === index
      );
    })
    .join(", ");

  return {
    ...wilayah,
    addressDetail: addressDetailClean,
    address,
    hasAdministrativeData: Boolean(
      wilayah.village ||
        wilayah.district ||
        wilayah.regency ||
        wilayah.province
    ),
  };
}

function pecahMetadata(value) {
  if (typeof value !== "string" || !value.trim()) return [];

  const pieces = value
    .split(/\s*[|;]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

  const hasil = [];

  for (const piece of pieces) {
    const match = piece.match(/^([^:]{2,70}):\s*(.+)$/);
    if (match) {
      const label = match[1]
        .trim()
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^\p{L}/u, (huruf) => huruf.toUpperCase());

      hasil.push({
        label,
        value: match[2].trim(),
      });
    }
  }

  return hasil;
}

export function susunMetadataSumber({ informationSource, description }) {
  const sumber = teksBersih(informationSource);
  const deskripsi = teksBersih(description);

  const metadata = [
    ...pecahMetadata(sumber),
    ...pecahMetadata(deskripsi),
  ];

  const unik = [];
  const seen = new Set();

  for (const item of metadata) {
    const key = `${item.label.toLocaleLowerCase("id-ID")}:${item.value.toLocaleLowerCase("id-ID")}`;
    if (!seen.has(key)) {
      seen.add(key);
      unik.push(item);
    }
  }

  const polaMetadata =
    /\b(dataset|source record|instansi|wilayah sungai|tahun konstruksi|kondisi fasilitas|status pekerjaan|pengelola)\s*:/i;

  const mengandungMetadata =
    metadata.length > 0 || polaMetadata.test(`${sumber} ${deskripsi}`);

  const deskripsiAdalahMetadata =
    pecahMetadata(deskripsi).length > 0 || polaMetadata.test(deskripsi);

  const namaSumber = sumber.split("|")[0].trim();

  return {
    sourceLabel: mengandungMetadata
      ? namaSumber || "Metadata dataset"
      : sumber || "Sumber informasi belum tersedia",
    metadata: unik,
    note: deskripsiAdalahMetadata ? "" : deskripsi,
  };
}
