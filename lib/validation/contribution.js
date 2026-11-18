import { isPlainObject, boundedText, positiveInteger, parseCoordinates } from "@/lib/validation/common";

const CONTRIBUTION_TYPES = new Set(["new_point", "update_point"]);
const SOURCE_TYPES = new Set(["public_well", "spring", "storage_tank", "emergency_tank", "hydrant", "reservoir", "other"]);
const AVAILABILITY = new Set(["available", "limited", "unavailable", "unknown"]);

export function validateContributionPayload(input) {
  if (!isPlainObject(input)) {
    return { valid: false, errors: ["Body kontribusi harus berupa objek JSON."] };
  }

  const errors = [];
  const contributionType = input.contribution_type;
  if (!CONTRIBUTION_TYPES.has(contributionType)) {
    errors.push("Jenis kontribusi harus new_point atau update_point.");
  }

  const pointName = boundedText(input.proposed_point_name, { field: "Nama titik air", max: 200, required: contributionType === "new_point" });
  const description = boundedText(input.proposed_description, { field: "Deskripsi", max: 3000 });
  const village = boundedText(input.proposed_village, { field: "Desa/kelurahan", max: 150 });
  const address = boundedText(input.proposed_address_detail, { field: "Alamat detail", max: 500 });
  const access = boundedText(input.proposed_access_information, { field: "Informasi akses", max: 2000 });
  const opening = boundedText(input.proposed_opening_hours, { field: "Jam operasional", max: 500 });
  const notes = boundedText(input.notes, { field: "Catatan", max: 2000 });

  for (const item of [pointName, description, village, address, access, opening, notes]) {
    if (!item.valid) errors.push(item.error);
  }

  const sourceType = input.proposed_water_source_type || null;
  if (contributionType === "new_point" && !SOURCE_TYPES.has(sourceType)) {
    errors.push("Jenis sumber air tidak valid.");
  }
  if (sourceType && !SOURCE_TYPES.has(sourceType)) {
    errors.push("Jenis sumber air tidak valid.");
  }

  const availability = input.proposed_availability_status || null;
  if (availability && !AVAILABILITY.has(availability)) {
    errors.push("Status ketersediaan air tidak valid.");
  }

  const province = positiveInteger(input.proposed_province_id, "Provinsi", { required: contributionType === "new_point" });
  const regency = positiveInteger(input.proposed_city_regency_id, "Kabupaten/kota", { required: contributionType === "new_point" });
  const district = positiveInteger(input.proposed_district_id, "Kecamatan");
  const waterPoint = positiveInteger(input.water_point_id, "ID titik air", { required: contributionType === "update_point" });

  for (const item of [province, regency, district, waterPoint]) {
    if (!item.valid) errors.push(item.error);
  }

  const coordinates = parseCoordinates(input.proposed_latitude, input.proposed_longitude);
  if (!coordinates.valid) errors.push(coordinates.error);

  let evidenceUrl = null;
  if (input.evidence_url != null && input.evidence_url !== "") {
    try {
      const url = new URL(String(input.evidence_url));
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      evidenceUrl = url.toString();
    } catch {
      errors.push("URL bukti harus berupa tautan HTTP/HTTPS yang valid.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: {
      contribution_type: contributionType,
      proposed_point_name: pointName.value || null,
      proposed_water_source_type: sourceType,
      proposed_description: description.value || null,
      proposed_province_id: province.value,
      proposed_city_regency_id: regency.value,
      proposed_district_id: district.value,
      proposed_village: village.value || null,
      proposed_address_detail: address.value || null,
      proposed_latitude: coordinates.latitude,
      proposed_longitude: coordinates.longitude,
      proposed_availability_status: availability,
      proposed_access_information: access.value || null,
      proposed_opening_hours: opening.value || null,
      evidence_url: evidenceUrl,
      notes: notes.value || null,
      water_point_id: waterPoint.value,
    },
  };
}
