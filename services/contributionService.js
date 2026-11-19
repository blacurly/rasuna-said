import { createClient } from "@/lib/supabase/server";
import { validateContributionPayload } from "@/lib/validation/contribution";

const REVIEW_STATUS_LABELS = {
  pending: "Menunggu Verifikasi",
  approved: "Terverifikasi",
  needs_revision: "Perlu Perbaikan",
  rejected: "Ditolak",
};

const ALLOWED_REVIEW_STATUSES = [
  "approved",
  "rejected",
  "needs_revision",
];

const ALLOWED_AVAILABILITY_STATUSES = [
  "available",
  "limited",
  "unavailable",
  "unknown",
];

function throwIfError(error) {
  if (error) {
    throw new Error(
      error.message || "Terjadi kesalahan pada database."
    );
  }
}

async function getAuthenticatedClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  throwIfError(error);

  if (!user) {
    throw new Error("Silakan masuk terlebih dahulu.");
  }

  return { supabase, user };
}

async function getAdminClient() {
  const { supabase, user } = await getAuthenticatedClient();

  const { data: isAdmin, error } = await supabase.rpc(
    "is_aira_admin"
  );

  throwIfError(error);

  if (isAdmin !== true) {
    throw new Error("Kamu tidak memiliki akses sebagai admin.");
  }

  return { supabase, user };
}

function formatSubmittedAt(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return "-";
  }

  return `${latitude}, ${longitude}`;
}

function formatAddress(contribution, regions = {}) {
  const parts = [
    contribution.proposed_address_detail,
    contribution.proposed_village,
    regions.districtName,
    regions.regencyName,
    regions.provinceName,
    "Indonesia",
  ].filter(Boolean);
  const unique = parts.filter((part, index) =>
    parts.findIndex((candidate) => candidate.toLocaleLowerCase("id-ID") === part.toLocaleLowerCase("id-ID")) === index
  );
  return unique.join(", ") || "-";
}

function parseManagerContact(value) {
  const text = String(value || "").trim();
  const marker = "Pengelola:";
  const line = text.split("\n").find((item) => item.trim().startsWith(marker));
  if (!line) return { name: "-", phone: "-" };

  const raw = line.trim().slice(marker.length).trim();
  if (!raw) return { name: "-", phone: "-" };

  // Format lama: "Pengelola: Nama, 08xxxxxxxxxx". Nama dapat mengandung koma,
  // sehingga hanya bagian terakhir yang diperlakukan sebagai nomor bila berisi digit.
  const parts = raw.split(",").map((item) => item.trim()).filter(Boolean);
  const last = parts.at(-1) || "";
  const phoneCandidate = last.replace(/[\s().+-]/g, "");
  const hasPhone = /^\d{8,15}$/.test(phoneCandidate);
  return {
    name: (hasPhone ? parts.slice(0, -1) : parts).join(", ") || "-",
    phone: hasPhone ? last : "-",
  };
}

function mapContributionToUI(contribution, latestReview, contributorName = null, regions = {}) {
  const status =
    latestReview?.review_status ||
    contribution.status ||
    "pending";

  return {
    id: contribution.contribution_id,

    name:
      contribution.proposed_point_name ||
      "Nama titik air belum tersedia",

    verificationStatus:
      REVIEW_STATUS_LABELS[status] ||
      "Menunggu Verifikasi",

    // Status usulan kontributor hanya untuk informasi admin.
    proposedAvailability:
      contribution.proposed_availability_status || "unknown",

    // Status akhir tidak boleh mengambil keputusan dari kontributor.
    // Admin menetapkan status ketersediaan setelah pemeriksaan.
    availability: "unknown",

    contributor:
      contributorName ||
      (contribution.contributor_user_id
        ? `Warga #${String(contribution.contributor_user_id).slice(0, 6)}`
        : "Warga"),
    contributorUserId: contribution.contributor_user_id || null,

    submittedAt: formatSubmittedAt(
      contribution.submitted_at
    ),

    category:
      contribution.proposed_water_source_type || "-",

    contact: (() => {
      const contact = parseManagerContact(contribution.proposed_access_information);
      return contact.phone !== "-"
        ? `${contact.name} (${contact.phone})`
        : contact.name;
    })(),
    managerName: parseManagerContact(contribution.proposed_access_information).name,
    managerPhone: parseManagerContact(contribution.proposed_access_information).phone,

    address: formatAddress(contribution, regions),

    coordinates: formatCoordinates(
      contribution.proposed_latitude,
      contribution.proposed_longitude
    ),

    description: contribution.proposed_description || "-",
    accessInformation: contribution.proposed_access_information || "-",

    notes: contribution.notes || "",

    adminReviewGuidance:
      contribution.admin_review_guidance || "",

    adminReviewNote:
      contribution.admin_review_note || "",

    evidenceUrl: contribution.evidence_url || null,
    googleMapsUrl: contribution.evidence_url || null,

    contributionType: contribution.contribution_type,

    waterPointId: contribution.water_point_id || null,

    reviewStatus: status,

    reviewedAt: contribution.reviewed_at || null,
  };
}

// ======================================================
// PUBLIC: Mengambil daftar titik air terverifikasi
// ======================================================

export async function getPublicWaterPoints() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("water_points")
    .select(`
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
      is_simulation,
      created_at,
      updated_at
    `)
    .eq("is_active", true)
    .eq("verification_status", "verified")
    .eq("is_simulation", false)
    .order("point_name", { ascending: true });

  throwIfError(error);

  return data || [];
}

// ======================================================
// USER: Mengirim kontribusi titik air
// ======================================================

export async function submitWaterPointContribution(input) {
  const { supabase, user } = await getAuthenticatedClient();

  const validation = validateContributionPayload(input);
  if (!validation.valid) {
    const error = new Error(validation.errors.join(" "));
    error.status = 422;
    error.code = "CONTRIBUTION_VALIDATION_FAILED";
    throw error;
  }

  // Gunakan payload hasil validasi agar Server Action dan Route Handler
  // menerapkan kontrak field serta aturan validasi yang sama.
  input = validation.value;
  const contributionType = input.contribution_type;

  if (!["new_point", "update_point"].includes(contributionType)) {
    throw new Error("Jenis kontribusi tidak valid.");
  }

  const pointName = input.proposed_point_name?.trim();
  const sourceType = input.proposed_water_source_type;

  if (contributionType === "new_point") {
    if (!pointName) {
      throw new Error("Nama titik air wajib diisi.");
    }

    if (!sourceType) {
      throw new Error("Jenis sumber air wajib diisi.");
    }

    if (
      !input.proposed_province_id ||
      !input.proposed_city_regency_id
    ) {
      throw new Error(
        "Provinsi dan kabupaten/kota wajib diisi."
      );
    }
  }

  if (
    contributionType === "update_point" &&
    !input.water_point_id
  ) {
    throw new Error(
      "Titik air yang akan diperbarui wajib dipilih."
    );
  }

  const latitude = input.proposed_latitude;
  const longitude = input.proposed_longitude;

  const hasLatitude =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "";

  const hasLongitude =
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "";

  if (hasLatitude !== hasLongitude) {
    throw new Error(
      "Latitude dan longitude harus diisi berpasangan."
    );
  }

  const parsedLatitude = hasLatitude ? Number(latitude) : null;
  const parsedLongitude = hasLongitude ? Number(longitude) : null;

  if (
    hasLatitude &&
    (
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    )
  ) {
    throw new Error("Koordinat tidak valid.");
  }

  const proposedAvailability =
    input.proposed_availability_status || null;

  if (
    proposedAvailability !== null &&
    !ALLOWED_AVAILABILITY_STATUSES.includes(
      proposedAvailability
    )
  ) {
    throw new Error(
      "Status ketersediaan yang diusulkan tidak valid."
    );
  }

  const payload = {
    contributor_user_id: user.id,

    water_point_id:
      contributionType === "update_point"
        ? Number(input.water_point_id)
        : null,

    contribution_type: contributionType,

    proposed_point_name: pointName || null,
    proposed_water_source_type: sourceType || null,
    proposed_description: input.proposed_description || null,

    proposed_province_id: input.proposed_province_id
      ? Number(input.proposed_province_id)
      : null,

    proposed_city_regency_id: input.proposed_city_regency_id
      ? Number(input.proposed_city_regency_id)
      : null,

    proposed_district_id: input.proposed_district_id
      ? Number(input.proposed_district_id)
      : null,

    proposed_village: input.proposed_village || null,
    proposed_address_detail:
      input.proposed_address_detail || null,

    proposed_latitude: parsedLatitude,
    proposed_longitude: parsedLongitude,

    proposed_availability_status: proposedAvailability,

    proposed_access_information:
      input.proposed_access_information || null,

    proposed_opening_hours:
      input.proposed_opening_hours || null,

    evidence_url: input.evidence_url || null,
    notes: input.notes || null,
  };

  if (
    contributionType === "update_point" &&
    (
      !Number.isSafeInteger(payload.water_point_id) ||
      payload.water_point_id <= 0
    )
  ) {
    throw new Error("ID titik air tidak valid.");
  }

  const { data, error } = await supabase
    .from("water_point_contributions")
    .insert(payload)
    .select("*")
    .single();

  throwIfError(error);

  return data;
}

// ======================================================
// USER: Melihat kontribusi milik sendiri
// ======================================================

export async function getMyWaterPointContributions() {
  const { supabase, user } = await getAuthenticatedClient();

  const { data: contributions, error } = await supabase
    .from("water_point_contributions")
    .select("*")
    .eq("contributor_user_id", user.id)
    .order("submitted_at", { ascending: false });

  throwIfError(error);

  if (!contributions?.length) {
    return [];
  }

  const contributionIds = contributions.map(
    (item) => item.contribution_id
  );

  const { data: reviews, error: reviewError } = await supabase
    .from("contribution_reviews")
    .select("*")
    .in("contribution_id", contributionIds)
    .order("reviewed_at", { ascending: false })
    .order("review_id", { ascending: false });

  throwIfError(reviewError);

  const latestReviewByContribution = new Map();

  for (const review of reviews || []) {
    if (
      !latestReviewByContribution.has(review.contribution_id)
    ) {
      latestReviewByContribution.set(
        review.contribution_id,
        review
      );
    }
  }

  return contributions.map((contribution) => {
    const latestReview = latestReviewByContribution.get(
      contribution.contribution_id
    );

    return {
      ...contribution,
      review: latestReview || null,
      status:
        latestReview?.review_status ||
        contribution.status ||
        "pending",
    };
  });
}

// ======================================================
// ADMIN: Melihat seluruh kontribusi
// ======================================================

export async function getAdminWaterPointContributions() {
  const { supabase } = await getAdminClient();

  const { data: contributions, error } = await supabase
    .from("water_point_contributions")
    .select("*")
    .order("submitted_at", { ascending: false });

  throwIfError(error);

  if (!contributions?.length) {
    return [];
  }

  const contributionIds = contributions.map(
    (item) => item.contribution_id
  );

  const contributorIds = [...new Set(
    contributions.map((item) => item.contributor_user_id).filter(Boolean)
  )];
  let contributorNameById = new Map();

  if (contributorIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("users")
      .select("user_id, full_name")
      .in("user_id", contributorIds);

    throwIfError(profileError);
    contributorNameById = new Map(
      (profiles || []).map((profile) => [profile.user_id, profile.full_name])
    );
  }

  const provinceIds = [...new Set(contributions.map((item) => item.proposed_province_id).filter(Boolean))];
  const regencyIds = [...new Set(contributions.map((item) => item.proposed_city_regency_id).filter(Boolean))];
  const districtIds = [...new Set(contributions.map((item) => item.proposed_district_id).filter(Boolean))];
  const [provinceResult, regencyResult, districtResult] = await Promise.all([
    provinceIds.length ? supabase.from("provinces").select("province_id, province_name").in("province_id", provinceIds) : Promise.resolve({ data: [], error: null }),
    regencyIds.length ? supabase.from("city_regencies").select("city_regency_id, city_regency_name").in("city_regency_id", regencyIds) : Promise.resolve({ data: [], error: null }),
    districtIds.length ? supabase.from("districts").select("district_id, district_name").in("district_id", districtIds) : Promise.resolve({ data: [], error: null }),
  ]);
  throwIfError(provinceResult.error);
  throwIfError(regencyResult.error);
  throwIfError(districtResult.error);

  const provinceNameById = new Map((provinceResult.data || []).map((item) => [Number(item.province_id), item.province_name]));
  const regencyNameById = new Map((regencyResult.data || []).map((item) => [Number(item.city_regency_id), item.city_regency_name]));
  const districtNameById = new Map((districtResult.data || []).map((item) => [Number(item.district_id), item.district_name]));

  const { data: reviews, error: reviewError } = await supabase
    .from("contribution_reviews")
    .select("*")
    .in("contribution_id", contributionIds)
    .order("reviewed_at", { ascending: false })
    .order("review_id", { ascending: false });

  throwIfError(reviewError);

  const latestReviewByContribution = new Map();

  for (const review of reviews || []) {
    if (
      !latestReviewByContribution.has(review.contribution_id)
    ) {
      latestReviewByContribution.set(
        review.contribution_id,
        review
      );
    }
  }

  return contributions.map((contribution) => {
    const latestReview = latestReviewByContribution.get(
      contribution.contribution_id
    );

    return mapContributionToUI(
      contribution,
      latestReview,
      contributorNameById.get(contribution.contributor_user_id) || null,
      {
        provinceName: provinceNameById.get(Number(contribution.proposed_province_id)),
        regencyName: regencyNameById.get(Number(contribution.proposed_city_regency_id)),
        districtName: districtNameById.get(Number(contribution.proposed_district_id)),
      }
    );
  });
}

// ======================================================
// ADMIN: Menyetujui, menolak, atau meminta revisi
// ======================================================

export async function reviewWaterPointContribution({
  contributionId,
  reviewStatus,
  reviewNotes = null,
  availabilityStatus = null,
}) {
  const { supabase } = await getAdminClient();

  const id = Number(contributionId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("ID kontribusi tidak valid.");
  }

  if (!ALLOWED_REVIEW_STATUSES.includes(reviewStatus)) {
    throw new Error("Status review tidak valid.");
  }

  if (
    availabilityStatus !== null &&
    !ALLOWED_AVAILABILITY_STATUSES.includes(
      availabilityStatus
    )
  ) {
    throw new Error("Status ketersediaan tidak valid.");
  }

  if (
    reviewStatus === "approved" &&
    availabilityStatus === null
  ) {
    throw new Error(
      "Pilih status ketersediaan sebelum menyetujui kontribusi."
    );
  }

  // RPC tetap bertanggung jawab atas proses verifikasi kontribusi.
  const { data, error } = await supabase.rpc(
    "review_water_point_contribution",
    {
      p_contribution_id: id,
      p_review_status: reviewStatus,
      p_review_notes: reviewNotes?.trim() || null,
    }
  );

  throwIfError(error);

  // Status ketersediaan hanya diterapkan ketika kontribusi disetujui.
  // Status pending/revisi/ditolak tidak mengubah data titik air.
  if (reviewStatus === "approved") {
    const { data: contribution, error: contributionError } =
      await supabase
        .from("water_point_contributions")
        .select("water_point_id")
        .eq("contribution_id", id)
        .single();

    throwIfError(contributionError);

    const waterPointId = Number(contribution?.water_point_id);

    if (
      !Number.isSafeInteger(waterPointId) ||
      waterPointId <= 0
    ) {
      throw new Error(
        "Kontribusi sudah diproses, tetapi ID titik air hasil persetujuan tidak ditemukan. Periksa fungsi RPC review_water_point_contribution."
      );
    }

    const { error: updateError } = await supabase
      .from("water_points")
      .update({
        availability_status: availabilityStatus,
        last_status_checked_at: new Date().toISOString(),
      })
      .eq("water_point_id", waterPointId);

    throwIfError(updateError);
  }

  return data;
}