// Pemetaan data Kontribusi Titik Air (Dashboard User, B04) antara bentuk formulir (Figma),
// baris database `water_point_contributions`, dan item tampilan. Tidak ada akses database.
import { JENIS_KONTRIBUSI, STATUS_LABEL, ketersediaanKeDb, ketersediaanKeLabel, parseKoordinat } from "@/lib/kontribusi";

// Pilihan "Jenis sumber" sesuai Figma Make.
export const JENIS_FORM = [
  "Sumur bor",
  "Sumur gali",
  "Tandon umum",
  "Mata air",
  "Embung",
  "Hidran umum",
  "Tangki air / BPBD",
  "Lainnya",
];

export const SUMBER_INFO_FORM = ["Saya melihat langsung", "Pengelola setempat", "Warga sekitar", "Lainnya"];

// Label formulir -> nilai database (Sumur gali memakai public_well + penanda di deskripsi).
const FORM_KE_DB = {
  "Sumur bor": "public_well",
  "Sumur gali": "public_well",
  "Tandon umum": "storage_tank",
  "Mata air": "spring",
  Embung: "reservoir",
  "Hidran umum": "hydrant",
  "Tangki air / BPBD": "emergency_tank",
  Lainnya: "other",
};

const DB_KE_FORM = {
  public_well: "Sumur bor",
  storage_tank: "Tandon umum",
  spring: "Mata air",
  reservoir: "Embung",
  hydrant: "Hidran umum",
  emergency_tank: "Tangki air / BPBD",
  other: "Lainnya",
};

const PENANDA_JENIS = "Jenis sumber: ";
const PENANDA_PENGELOLA = "Pengelola: ";
const PENANDA_SUMBER = "Sumber informasi: ";
const PENANDA_PERBAIKAN = /^Perbaikan dari #(\d+)$/;

export function jenisFormKeDb(label) {
  return FORM_KE_DB[label] ?? JENIS_KONTRIBUSI.find((j) => j.label === label)?.value ?? "other";
}

function labelJenis(row) {
  const dariDeskripsi = String(row.proposed_description ?? "")
    .split("\n")
    .find((l) => l.startsWith(PENANDA_JENIS));
  if (dariDeskripsi) return dariDeskripsi.slice(PENANDA_JENIS.length).trim();
  return DB_KE_FORM[row.proposed_water_source_type] ?? "Lainnya";
}

function pecahKontak(teks) {
  const t = String(teks ?? "");
  const i = t.lastIndexOf(", ");
  const adaTelepon = i >= 0 && /\d/.test(t.slice(i + 2));
  return { owner: adaTelepon ? t.slice(0, i) : t, phone: adaTelepon ? t.slice(i + 2) : "" };
}

// ID kontribusi yang diperbaiki oleh kontribusi ini (bila ada).
export function idDiperbaiki(row) {
  for (const l of String(row.notes ?? "").split("\n")) {
    const m = l.trim().match(PENANDA_PERBAIKAN);
    if (m) return Number(m[1]);
  }
  return null;
}

// Baris database -> item daftar "Kontribusi Anda" (+ data prefill untuk "Perbaiki dan Kirim Ulang").
export function keItemKontribusi(row, tanggalDikirim) {
  const status = STATUS_LABEL[row.status] ?? STATUS_LABEL.pending;

  const akses = String(row.proposed_access_information ?? "")
    .split("\n")
    .find((l) => l.startsWith(PENANDA_PENGELOLA));
  const { owner, phone } = pecahKontak(akses ? akses.slice(PENANDA_PENGELOLA.length) : "");

  let infoSource = "";
  const catatan = [];
  for (const l of String(row.notes ?? "").split("\n")) {
    const t = l.trim();
    if (!t || PENANDA_PERBAIKAN.test(t)) continue;
    if (t.startsWith(PENANDA_SUMBER)) infoSource = t.slice(PENANDA_SUMBER.length).trim();
    else catatan.push(t);
  }

  return {
    id: row.contribution_id,
    type: labelJenis(row),
    name: row.proposed_point_name || "Titik air tanpa nama",
    address: [row.proposed_address_detail, row.proposed_village].filter(Boolean).join(", ") || "-",
    submitted: tanggalDikirim,
    status,
    adminNote: status === "Perlu Perbaikan" || status === "Ditolak" ? row.review?.review_notes || undefined : undefined,
    extra: {
      maps: row.evidence_url || "",
      availability: ketersediaanKeLabel(row.proposed_availability_status),
      hours: row.proposed_opening_hours || "",
      owner,
      phone,
      infoSource,
      note: catatan.join("\n"),
    },
  };
}

// Isi formulir (Figma) -> payload untuk submitWaterPointContribution.
export function formKePayload(f, wilayah, perbaikiId = null) {
  const koordinat = parseKoordinat(f.maps);
  const kontak = [f.owner, f.phone].map((s) => String(s ?? "").trim()).filter(Boolean).join(", ");
  const catatan = [
    f.infoSource ? `${PENANDA_SUMBER}${f.infoSource}` : "",
    String(f.note ?? "").trim(),
    perbaikiId ? `Perbaikan dari #${perbaikiId}` : "",
  ].filter(Boolean);

  return {
    contribution_type: "new_point",
    proposed_point_name: String(f.name ?? "").trim(),
    proposed_water_source_type: jenisFormKeDb(f.type),
    proposed_description: f.type === "Sumur gali" ? `${PENANDA_JENIS}Sumur gali` : null,
    proposed_province_id: wilayah?.province_id ?? null,
    proposed_city_regency_id: wilayah?.city_regency_id ?? null,
    proposed_district_id: wilayah?.district_id ?? null,
    proposed_address_detail: String(f.address ?? "").trim(),
    proposed_latitude: koordinat?.latitude ?? null,
    proposed_longitude: koordinat?.longitude ?? null,
    proposed_availability_status: ketersediaanKeDb(f.avail) ?? "unknown",
    proposed_access_information: kontak ? `${PENANDA_PENGELOLA}${kontak}` : null,
    proposed_opening_hours: String(f.hours ?? "").trim() || null,
    evidence_url: String(f.maps ?? "").trim() || null,
    notes: catatan.join("\n") || null,
  };
}
