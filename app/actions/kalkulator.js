"use server";

import { createClient } from "@/lib/supabase/server";

import {
  jalankanKalkulator,
  validasiInput,
} from "@/services/calculatorFormService";

import {
  ambilRekomendasi,
} from "@/services/rekomendasiService";

import {
  ambilRataRataCurahHujan,
} from "@/services/curahHujanService";

// ======================================================
// 1. KONFIGURASI DAN NORMALISASI DATABASE
// ======================================================

// water_condition mengikuti enum database:
// safe, limited, critical, undetermined.

const KONDISI_DATABASE = {
  aman: "safe",
  normal: "safe",
  safe: "safe",
  "aman / relatif mencukupi": "safe",

  waspada: "limited",
  terbatas: "limited",
  limited: "limited",

  kritis: "critical",
  krisis: "critical",
  "mode krisis": "critical",
  critical: "critical",
  "tidak berfungsi": "critical",

  "belum diketahui": "undetermined",
  "belum dapat ditentukan": "undetermined",
  undetermined: "undetermined",
};

const PRIORITAS_DATABASE = ["high", "medium", "low"];

function detailError(error) {
  if (!error) return null;

  return {
    name: error.name ?? null,
    message: error.message ?? String(error),
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function normalisasiKondisiDatabase(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const kondisi = String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    if (KONDISI_DATABASE[kondisi]) {
      return KONDISI_DATABASE[kondisi];
    }
  }

  return "undetermined";
}

function normalisasiGuideId(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

// ======================================================
// 2. NORMALISASI PRIORITAS REKOMENDASI
// ======================================================

// Katalog menggunakan angka dengan prinsip:
// semakin kecil angka, semakin tinggi prioritas.
//
// Pemetaan ke enum database:
// 1-2 = high
// 3-4 = medium
// 5 ke atas = low

function normalisasiPrioritasDatabase(
  value,
  daftarPrioritasNumerik
) {
  if (value === null || value === undefined || value === "") {
    return "medium";
  }

  const nilai = String(value).trim().toLowerCase();

  if (PRIORITAS_DATABASE.includes(nilai)) {
    return nilai;
  }

  const angkaPrioritas = Number(nilai);

  if (!Number.isFinite(angkaPrioritas)) {
    return "medium";
  }

  if (daftarPrioritasNumerik.length <= 1) {
    return "medium";
  }

  const peringkat = daftarPrioritasNumerik.indexOf(
    angkaPrioritas
  );

  if (peringkat === -1) {
    return "medium";
  }

  const kategoriIndex = Math.min(
    2,
    Math.floor(
      (peringkat * 3) / daftarPrioritasNumerik.length
    )
  );

  return PRIORITAS_DATABASE[kategoriIndex];
}


// ======================================================
// 3. NORMALISASI DATA REKOMENDASI
// ======================================================

function normalisasiRekomendasi(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const daftarPrioritasNumerik = [
    ...new Set(
      items
        .map((item) => item?.priority ?? item?.prioritas)
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            value !== "" &&
            Number.isFinite(Number(value)) &&
            !PRIORITAS_DATABASE.includes(
              String(value).trim().toLowerCase()
            )
        )
        .map(Number)
    ),
  ].sort((a, b) => a - b);

  return items
    .map((item) => {
      const judul =
        item?.recommendation_title ||
        item?.nama ||
        item?.title ||
        item?.judul ||
        item?.nama_tindakan ||
        item?.action_title ||
        item?.kategori ||
        "Rekomendasi AIRA";

      const detail =
        item?.recommendation_detail ||
        item?.teks ||
        item?.detail ||
        item?.deskripsi ||
        item?.description ||
        item?.pesanPengguna ||
        item?.konteks ||
        item?.alasan ||
        "Ikuti rekomendasi tindakan sesuai kondisi ketersediaan air.";

      return {
        recommendation_title: String(judul)
          .trim()
          .slice(0, 200),

        recommendation_detail: String(detail).trim(),

        priority: normalisasiPrioritasDatabase(
          item?.priority ?? item?.prioritas,
          daftarPrioritasNumerik
        ),

        guide_id: normalisasiGuideId(item?.guide_id),
      };
    })
    .filter(
      (item) =>
        item.recommendation_title &&
        item.recommendation_detail &&
        PRIORITAS_DATABASE.includes(item.priority)
    );
}

// ======================================================
// 4. MENYIMPAN RIWAYAT KALKULATOR
// ======================================================

async function simpanRiwayatKalkulator({
  supabase,
  userId,
  masukan,
  hasil,
  rekomendasi,
}) {
  console.log(
    "[AIRA] Memulai penyimpanan riwayat kalkulator."
  );

  // Status hasil kalkulator menjadi acuan utama.
  // Kondisi sumber hanya menjadi cadangan jika status tidak dikenali.
  const kondisiDatabase = normalisasiKondisiDatabase(
    hasil?.status,
    hasil?.statusKey,
    masukan?.kondisi,
    masukan?.kondisiSumberAir
  );

  const dataAssessment = {
    household_id: null,
    assessed_by_user_id: userId,

    available_water_liters:
      hasil.cadanganAirLiter,

    daily_need_liters:
      hasil.kebutuhanHarianLiter,

    estimated_duration_days:
      hasil.durasiHari,

    water_condition: kondisiDatabase,

    crisis_mode: kondisiDatabase === "critical",

    assessment_notes:
      hasil.alasanStatus || null,

    input_snapshot: {
      input: masukan,
      result: hasil,
      recommendation_summary:
        rekomendasi?.ringkasan || "",
    },
  };

  console.log(
    "[AIRA] Menyimpan water_assessments:",
    {
      userId,
      waterCondition: kondisiDatabase,
      crisisMode: dataAssessment.crisis_mode,
    }
  );

  // 1. Simpan assessment terlebih dahulu.
  const {
    data: assessment,
    error: assessmentError,
  } = await supabase
    .from("water_assessments")
    .insert(dataAssessment)
    .select("assessment_id")
    .single();

  if (assessmentError) {
    console.error(
      "[AIRA] Gagal menyimpan water_assessments:",
      detailError(assessmentError)
    );

    throw assessmentError;
  }

  if (!assessment?.assessment_id) {
    throw new Error(
      "Assessment berhasil diproses tetapi assessment_id tidak ditemukan."
    );
  }

  const assessmentId = assessment.assessment_id;

  console.log(
    "[AIRA] Assessment berhasil disimpan:",
    assessmentId
  );

  // 2. Normalisasi rekomendasi.
  const jumlahRekomendasiAsli = Array.isArray(
    rekomendasi?.items
  )
    ? rekomendasi.items.length
    : 0;

  const daftarRekomendasi = normalisasiRekomendasi(
    rekomendasi?.items
  );

  console.log(
    "[AIRA] Hasil normalisasi rekomendasi:",
    {
      assessmentId,
      sumberKatalog: rekomendasi?.sumberKatalog ?? null,
      pemilih: rekomendasi?.pemilih ?? null,
      jumlahAsli: jumlahRekomendasiAsli,
      jumlahSiapDisimpan: daftarRekomendasi.length,
    }
  );

  // 3. Jika tidak ada rekomendasi, assessment tetap disimpan.
  if (daftarRekomendasi.length === 0) {
    console.warn(
      "[AIRA] Assessment tersimpan, tetapi tidak ada rekomendasi untuk disimpan."
    );

    return {
      saved: true,
      complete: false,
      assessmentId,
      recommendationsSaved: false,
      recommendationCount: 0,
      recommendationReason: "no_recommendations",
    };
  }

  // 4. Siapkan data sesuai struktur assessment_recommendations.
  const rows = daftarRekomendasi.map((item) => ({
    assessment_id: assessmentId,
    guide_id: item.guide_id,
    recommendation_title: item.recommendation_title,
    recommendation_detail: item.recommendation_detail,
    priority: item.priority,
    action_status: "pending",
  }));

  // 5. Simpan rekomendasi.
  const {
    error: recommendationError,
  } = await supabase
    .from("assessment_recommendations")
    .insert(rows);

  if (recommendationError) {
    console.error(
      "[AIRA] Gagal menyimpan assessment_recommendations:",
      {
        assessmentId,
        ...detailError(recommendationError),
      }
    );

    return {
      saved: true,
      complete: false,
      assessmentId,
      recommendationsSaved: false,
      recommendationCount: 0,
      recommendationError: recommendationError.message,
      recommendationErrorCode:
        recommendationError.code ?? null,
    };
  }

  console.log(
    "[AIRA] Rekomendasi berhasil disimpan:",
    {
      assessmentId,
      jumlah: rows.length,
    }
  );

  return {
    saved: true,
    complete: true,
    assessmentId,
    recommendationsSaved: true,
    recommendationCount: rows.length,
  };
}

// ======================================================
// 5. SERVER ACTION KALKULATOR AIRA
// ======================================================

export async function hitungKalkulator(input, options = {}) {
  console.log(
    "[AIRA] ========================================"
  );

  console.log(
    "[AIRA] Server Action hitungKalkulator terpanggil."
  );

  console.log(
    "[AIRA] Waktu:",
    new Date().toISOString()
  );

  const masukan = input ?? {};

  // 1. Validasi input.
  const cek = validasiInput(masukan);

  console.log(
    "[AIRA] Hasil validasi:",
    {
      valid: cek.valid,
      pesan: cek.pesan ?? cek.errors ?? null,
    }
  );

  if (!cek.valid) {
    const hasilTidakValid = jalankanKalkulator(
      masukan,
      null
    );

    return {
      ...hasilTidakValid,

      rekomendasi: {
        items: [],
        ringkasan: "",
        sumber: "tidak-tersedia",
        sumberKatalog: "tidak-tersedia",
        pemilih: "aturan",
      },

      penyimpanan: {
        saved: false,
        reason: "invalid_input",
      },

      dataCurahHujan: null,
    };
  }

  // 2. Ambil data curah hujan jika lokasi tersedia.
  let dataCurahHujan = null;

  if (
    typeof masukan.lokasi === "string" &&
    masukan.lokasi.trim()
  ) {
    try {
      console.log(
        "[AIRA] Mengambil data curah hujan:",
        masukan.lokasi
      );

      dataCurahHujan = await ambilRataRataCurahHujan(
        masukan.lokasi
      );

      console.log(
        "[AIRA] Hasil curah hujan:",
        {
          tersedia: Boolean(dataCurahHujan),
          curahHujanMmPerBulan:
            dataCurahHujan?.curahHujanMmPerBulan ?? null,
        }
      );
    } catch (error) {
      console.error(
        "[AIRA] Gagal mengambil curah hujan:",
        detailError(error)
      );
    }
  }

  const curahHujanMm =
    dataCurahHujan?.curahHujanMmPerBulan ?? null;

  // 3. Jalankan kalkulator.
  const hasil = jalankanKalkulator(
    masukan,
    curahHujanMm
  );

  console.log(
    "[AIRA] Hasil kalkulator:",
    {
      valid: hasil?.valid ?? null,
      status: hasil?.status ?? null,
      statusKey: hasil?.statusKey ?? null,
      cadanganAirLiter:
        hasil?.cadanganAirLiter ?? null,
      kebutuhanHarianLiter:
        hasil?.kebutuhanHarianLiter ?? null,
      durasiHari: hasil?.durasiHari ?? null,
    }
  );

  // 4. Ambil rekomendasi berbasis aturan.
  // Kalkulator tidak perlu menunggu Gemini.
  let rekomendasi = {
    items: [],
    ringkasan: "",
    sumber: "tidak-tersedia",
    sumberKatalog: "tidak-tersedia",
    pemilih: "aturan",
  };

  try {
    const hasilRekomendasi = await ambilRekomendasi(
      masukan,
      hasil,
      { pakaiAI: false }
    );

    if (
      hasilRekomendasi &&
      Array.isArray(hasilRekomendasi.items)
    ) {
      rekomendasi = hasilRekomendasi;
    }

    console.log(
      "[AIRA] Hasil Recommendation System:",
      {
        jumlah: rekomendasi.items.length,
        sumberKatalog:
          rekomendasi.sumberKatalog ?? null,
        pemilih: rekomendasi.pemilih ?? null,
      }
    );
  } catch (error) {
    console.error(
      "[AIRA] Recommendation System gagal:",
      detailError(error)
    );
  }

  // 5. Status awal penyimpanan.
  // Form kalkulator utama menyimpan household + assessment melalui RPC
  // save_water_assessment. Karena itu, pemanggil form mengirim
  // { simpanRiwayat: false } agar tidak membuat assessment kedua.
  // Endpoint API lama tetap dapat memakai penyimpanan server default.
  let penyimpanan = {
    saved: false,
    reason: options?.simpanRiwayat === false
      ? "delegated_to_household_rpc"
      : "guest",
  };

  if (options?.simpanRiwayat !== false) {
  // 6. Periksa sesi pengguna.
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(
        "[AIRA] Gagal memeriksa sesi:",
        detailError(authError)
      );
    }

    if (user) {
      try {
        penyimpanan = await simpanRiwayatKalkulator({
          supabase,
          userId: user.id,
          masukan,
          hasil,
          rekomendasi,
        });
      } catch (saveError) {
        console.error(
          "[AIRA] Gagal menyimpan riwayat kalkulator:",
          detailError(saveError)
        );

        penyimpanan = {
          saved: false,
          complete: false,
          reason: "save_failed",
          error: saveError.message,
          code: saveError.code ?? null,
        };
      }
    } else {
      penyimpanan = {
        saved: false,
        reason: authError ? "auth_error" : "guest",
        error: authError?.message ?? null,
      };
    }
  } catch (error) {
    console.error(
      "[AIRA] Koneksi atau sesi Supabase gagal:",
      detailError(error)
    );

    penyimpanan = {
      saved: false,
      complete: false,
      reason: "session_unavailable",
      error: error.message,
      code: error.code ?? null,
    };
  }
  } // akhir if (options.simpanRiwayat !== false)

  // 7. Log hasil akhir.
  console.log(
    "[AIRA] hitungKalkulator selesai:",
    {
      status: hasil?.status ?? null,
      saved: penyimpanan.saved,
      complete: penyimpanan.complete ?? false,
      assessmentId: penyimpanan.assessmentId ?? null,
      recommendationsSaved:
        penyimpanan.recommendationsSaved ?? false,
      recommendationCount:
        penyimpanan.recommendationCount ?? 0,
      reason: penyimpanan.reason ?? null,
    }
  );

  console.log(
    "[AIRA] ========================================"
  );

  // 8. Kembalikan hasil ke halaman kalkulator.
  return {
    ...hasil,
    rekomendasi,
    penyimpanan,
    dataCurahHujan,
  };
}

// ======================================================
// MENYIMPAN REKOMENDASI KE ASSESSMENT DARI RPC HOUSEHOLD
// ======================================================

export async function simpanRekomendasiAssessment(assessmentIdInput, items) {
  const assessmentId = Number(assessmentIdInput);

  if (!Number.isSafeInteger(assessmentId) || assessmentId <= 0) {
    return { saved: false, reason: "invalid_assessment_id" };
  }

  const daftarRekomendasi = normalisasiRekomendasi(items);

  if (daftarRekomendasi.length === 0) {
    return { saved: true, recommendationCount: 0, reason: "no_recommendations" };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { saved: false, reason: "unauthenticated" };
  }

  // Pastikan assessment memang milik pengguna yang sedang login.
  const { data: assessment, error: assessmentError } = await supabase
    .from("water_assessments")
    .select("assessment_id")
    .eq("assessment_id", assessmentId)
    .eq("assessed_by_user_id", user.id)
    .maybeSingle();

  if (assessmentError) throw assessmentError;
  if (!assessment) {
    return { saved: false, reason: "assessment_not_owned_or_not_found" };
  }

  // Idempotensi: jika rekomendasi untuk assessment ini sudah ada, jangan insert ulang.
  const { data: existing, error: existingError } = await supabase
    .from("assessment_recommendations")
    .select("recommendation_id")
    .eq("assessment_id", assessmentId)
    .limit(1);

  if (existingError) throw existingError;
  if (existing?.length) {
    return {
      saved: true,
      alreadySaved: true,
      recommendationCount: existing.length,
    };
  }

  const rows = daftarRekomendasi.map((item) => ({
    assessment_id: assessmentId,
    guide_id: item.guide_id,
    recommendation_title: item.recommendation_title,
    recommendation_detail: item.recommendation_detail,
    priority: item.priority,
    action_status: "pending",
  }));

  const { error: insertError } = await supabase
    .from("assessment_recommendations")
    .insert(rows);

  if (insertError) throw insertError;

  return { saved: true, recommendationCount: rows.length };
}

// ======================================================
// PRATINJAU CURAH HUJAN UNTUK FORMULIR (A02)
// ======================================================

// Dipakai formulir untuk menampilkan keterangan curah hujan segera setelah
// provinsi, kabupaten/kota, dan kecamatan dipilih. Sumber datanya sama dengan
// perhitungan akhir (ambilRataRataCurahHujan), sehingga angka yang tampil di
// formulir selalu sama dengan angka di halaman hasil.
export async function ambilCurahHujanLokasi(lokasi) {
  if (typeof lokasi !== "string" || !lokasi.trim()) {
    return {
      ok: false,
      status: "unavailable",
      reason: "invalid_location",
      curahHujanMmPerBulan: null,
    };
  }

  try {
    const data = await ambilRataRataCurahHujan(lokasi.trim());
    const mm = data?.curahHujanMmPerBulan;
    const ok = data?.status === "available" &&
      typeof mm === "number" && Number.isFinite(mm);

    return {
      ok,
      status: data?.status || "unavailable",
      reason: data?.alasan || null,
      curahHujanMmPerBulan: ok ? Math.round(mm) : null,
      source: data?.sumberData || null,
      period: data?.periodeData || null,
    };
  } catch (error) {
    console.error("[AIRA] Pratinjau curah hujan gagal:", detailError(error));
    return {
      ok: false,
      status: "error",
      reason: "external_service_unavailable",
      curahHujanMmPerBulan: null,
    };
  }
}
