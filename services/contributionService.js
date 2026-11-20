import { createClient } from "@/lib/supabase/server";

const REVIEW_STATUS_LABELS = {
  pending: "Menunggu Verifikasi",
  approved: "Terverifikasi",
  needs_revision: "Perlu Perbaikan",
  rejected: "Ditolak",
};

function throwIfError(error) {
  if (error) {
    throw new Error(
      error.message || "Terjadi kesalahan pada database."
    );
  }
}

// ======================================================
// AUTHENTICATION & AUTHORIZATION
// ======================================================

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

// ======================================================
// FORMAT HELPERS
// ======================================================

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

function formatAddress(contribution) {
  return [
    contribution.proposed_address_detail,
    contribution.proposed_village,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

// ======================================================
// REVIEW HELPERS
// ======================================================

function normalizeReview(review) {
  if (!review) return null;

  return {
    ...review,

    // Kompatibilitas dengan UI lama.
    review_status: review.new_status,
    review_notes: review.review_note,
    reviewer_user_id: review.reviewed_by,
  };
}

function getReviewStatus(contribution, latestReview) {
  // Status pada record kontribusi utama adalah status terkini. Review table
  // dipakai sebagai fallback, bukan untuk menimpa status setelah pengguna revisi.
  return contribution.status || latestReview?.new_status || "pending";
}

// ======================================================
// MAP CONTRIBUTION TO ADMIN UI
// ======================================================

function mapContributionToUI(contribution, latestReview) {
  const review = normalizeReview(latestReview);

  const status = getReviewStatus(contribution, review);

  const contributor = contribution.contributor ?? null;

  const contributorName =
    contributor?.full_name?.trim() ||
    "Pengguna tidak ditemukan";

  const contributorEmail =
    contributor?.email?.trim() || "-";

  return {
    id: contribution.contribution_id,

    name:
      contribution.proposed_point_name ||
      "Nama titik air belum tersedia",

    verificationStatus:
      REVIEW_STATUS_LABELS[status] ||
      "Menunggu Verifikasi",

    availability:
      contribution.proposed_availability_status || "unknown",

    contributor: contributorName,
    contributorName,
    contributorEmail,

    contributorId: contribution.contributor_user_id,

    submittedAt: formatSubmittedAt(
      contribution.submitted_at
    ),

    category:
      contribution.proposed_water_source_type || "-",

    contact: "-",

    address: formatAddress(contribution),

    coordinates: formatCoordinates(
      contribution.proposed_latitude,
      contribution.proposed_longitude
    ),

    description:
      contribution.proposed_description ||
      contribution.proposed_access_information ||
      "-",

    notes:
      review?.review_notes ??
      contribution.admin_review_note ??
      contribution.notes ??
      "",

    evidenceUrl: contribution.evidence_url || null,

    contributionType: contribution.contribution_type,

    waterPointId: contribution.water_point_id,

    reviewStatus: status,

    // Data review lengkap tetap tersedia untuk UI.
    review,
  };
}

// ======================================================
// FETCH LATEST REVIEWS
// ======================================================

async function getLatestReviews(
  supabase,
  contributionIds
) {
  if (!contributionIds?.length) {
    return new Map();
  }

  const { data: reviews, error } = await supabase
    .from("water_point_contribution_reviews")
    .select(`
      review_id,
      contribution_id,
      reviewed_by,
      previous_status,
      new_status,
      review_note,
      reviewed_at,
      updated_by,
      updated_at,
      edit_reason,
      is_archived,
      archived_by,
      archived_at,
      archive_reason
    `)
    .in("contribution_id", contributionIds)
    .eq("is_archived", false)
    .order("reviewed_at", { ascending: false })
    .order("review_id", { ascending: false });

  throwIfError(error);

  const latestReviewByContribution = new Map();

  for (const review of reviews || []) {
    if (
      !latestReviewByContribution.has(
        review.contribution_id
      )
    ) {
      latestReviewByContribution.set(
        review.contribution_id,
        review
      );
    }
  }

  return latestReviewByContribution;
}

// ======================================================
// PUBLIC: MENGAMBIL DAFTAR TITIK AIR TERVERIFIKASI
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
// USER: MENGIRIM KONTRIBUSI TITIK AIR
// ======================================================

export async function submitWaterPointContribution(input, perbaikiId = null) {
  const { supabase, user } = await getAuthenticatedClient();

  if (!input || typeof input !== "object") {
    throw new Error("Data kontribusi tidak valid.");
  }

  const contributionType = input.contribution_type;

  if (
    !["new_point", "update_point"].includes(
      contributionType
    )
  ) {
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

  const parsedLatitude = hasLatitude
    ? Number(latitude)
    : null;

  const parsedLongitude = hasLongitude
    ? Number(longitude)
    : null;

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

  const payload = {
    contributor_user_id: user.id,

    water_point_id:
      contributionType === "update_point"
        ? Number(input.water_point_id)
        : null,

    contribution_type: contributionType,

    proposed_point_name: pointName || null,

    proposed_water_source_type:
      sourceType || null,

    proposed_description:
      input.proposed_description || null,

    proposed_province_id:
      input.proposed_province_id
        ? Number(input.proposed_province_id)
        : null,

    proposed_city_regency_id:
      input.proposed_city_regency_id
        ? Number(input.proposed_city_regency_id)
        : null,

    proposed_district_id:
      input.proposed_district_id
        ? Number(input.proposed_district_id)
        : null,

    proposed_village:
      input.proposed_village || null,

    proposed_address_detail:
      input.proposed_address_detail || null,

    proposed_latitude: parsedLatitude,

    proposed_longitude: parsedLongitude,

    proposed_availability_status:
      input.proposed_availability_status || null,

    proposed_access_information:
      input.proposed_access_information || null,

    proposed_opening_hours:
      input.proposed_opening_hours || null,

    evidence_url:
      input.evidence_url || null,

    notes:
      input.notes || null,
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

  // Revisi harus memperbarui record kontribusi yang sama, bukan INSERT baru.
  if (perbaikiId !== null && perbaikiId !== undefined) {
    const id = Number(perbaikiId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("ID kontribusi untuk perbaikan tidak valid.");
    }

    const { data: existing, error: fetchError } = await supabase
      .from("water_point_contributions")
      .select("contribution_id, status, contributor_user_id")
      .eq("contribution_id", id)
      .eq("contributor_user_id", user.id)
      .maybeSingle();

    throwIfError(fetchError);
    if (!existing) throw new Error("Kontribusi tidak ditemukan atau bukan milik Anda.");
    if (existing.status !== "needs_revision") {
      throw new Error("Kontribusi ini tidak sedang menunggu perbaikan.");
    }

    const { data, error } = await supabase
      .from("water_point_contributions")
      .update({
        ...payload,
        status: "pending",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        admin_review_note: null,
        admin_review_guidance: null,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("contribution_id", id)
      .eq("contributor_user_id", user.id)
      .eq("status", "needs_revision")
      .select("*")
      .single();

    throwIfError(error);
    return data;
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
// USER: MELIHAT KONTRIBUSI MILIK SENDIRI
// ======================================================

export async function getMyWaterPointContributions() {
  const { supabase, user } =
    await getAuthenticatedClient();

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

  const latestReviewByContribution =
    await getLatestReviews(
      supabase,
      contributionIds
    );

  return contributions.map((contribution) => {
    const latestReview =
      latestReviewByContribution.get(
        contribution.contribution_id
      );

    const review = normalizeReview(latestReview);

    return {
      ...contribution,

      review,

      status: getReviewStatus(
        contribution,
        review
      ),
    };
  });
}

// ======================================================
// ADMIN: MELIHAT SELURUH KONTRIBUSI
// ======================================================

export async function getAdminWaterPointContributions() {
  const { supabase } = await getAdminClient();

  const { data: contributions, error } = await supabase
    .from("water_point_contributions")
    .select(`
      *,
      contributor:users!fk_contribution_user (
        user_id,
        full_name,
        email
      )
    `)
    .order("submitted_at", { ascending: false });

  throwIfError(error);

  if (!contributions?.length) {
    return [];
  }

  const contributionIds = contributions.map(
    (item) => item.contribution_id
  );

  const latestReviewByContribution =
    await getLatestReviews(
      supabase,
      contributionIds
    );

  return contributions.map((contribution) => {
    const latestReview =
      latestReviewByContribution.get(
        contribution.contribution_id
      );

    return mapContributionToUI(
      contribution,
      latestReview
    );
  });
}

// ======================================================
// ADMIN: MENYETUJUI, MENOLAK, ATAU MEMINTA REVISI
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

  if (
    !["approved", "rejected", "needs_revision"].includes(
      reviewStatus
    )
  ) {
    throw new Error("Status review tidak valid.");
  }

  if (reviewStatus === "approved" && !["available", "limited", "unavailable", "unknown"].includes(availabilityStatus)) {
    throw new Error("Status ketersediaan wajib dipilih saat menyetujui kontribusi.");
  }

  const { data, error } = await supabase.rpc(
    "review_water_point_contribution",
    {
      p_contribution_id: id,
      p_review_status: reviewStatus,
      p_review_notes: reviewNotes?.trim() || null,
      p_availability_status: reviewStatus === "approved" ? availabilityStatus : null,
    }
  );

  throwIfError(error);

  return data;
}