// Recommendation System berbasis aturan untuk hasil Kalkulator Air.
// Katalog diambil dari Supabase (katalog_tindakan).
//
// Urutan sumber katalog:
// 1. Supabase
// 2. Cache terakhir yang berhasil
// 3. KATALOG_FALLBACK
//
// Status tetap ditentukan oleh calculatorService.js.
// AI tidak menentukan status dan tidak menulis ulang teks tindakan. AI hanya memilih
// dan mengurutkan tindakan TAMBAHAN dari katalog serta menulis alasan singkat;
// tindakan wajib selalu dipasang kode di urutan teratas. Jika AI gagal, urutan aturan dipakai.


import {
  STATUS_AMAN,
  STATUS_KRISIS,
  STATUS_TIDAK_DITENTUKAN,
  STATUS_WASPADA,
} from "@/services/calculatorService";

import { KATALOG_FALLBACK } from "@/data/katalogTindakanFallback";

import {
  BATAS_KANDIDAT_AI,
  pilihTindakanDenganAI,
} from "@/services/aiService";

// ======================================================
// 1. KONFIGURASI
// ======================================================

export const TABEL_KATALOG =
  process.env.SUPABASE_TABLE_KATALOG || "katalog_tindakan";

export const BATAS_REKOMENDASI = 5;

export const FITUR_NAVIGATION_AIR_TERSEDIA = true;

const TTL_CACHE_MS = 5 * 60 * 1000;
const TIMEOUT_SUPABASE_MS = 3000;

export const ID = {
  NAVIGATION_AIR: "buka_navigation_air",
  PERIKSA_DATA: "periksa_data_kalkulator",
  MHM_UTAMA: "kebersihan_mhm",
  KONFIRMASI_KONDISI: "konfirmasi_kondisi_sumber",
  SUMBER_ALTERNATIF: "cari_sumber_alternatif",
};

const KOLOM_PRIORITAS = {
  [STATUS_AMAN]: "prioritas_aman",
  [STATUS_WASPADA]: "prioritas_waspada",
  [STATUS_KRISIS]: "prioritas_krisis",
  [STATUS_TIDAK_DITENTUKAN]:
    "prioritas_belum_ditentukan",
};

const KONDISI_DIKENAL = [
  "semua kondisi",
  "normal",
  "terbatas",
  "tidak berfungsi",
  "belum diketahui",
];

export const RINGKASAN_PER_STATUS = {
  [STATUS_AMAN]:
    "Cadangan diperkirakan mencukupi berdasarkan input dan asumsi AIRA. Tetap pantau kondisi dan rencanakan pengisian ulang.",

  [STATUS_WASPADA]:
    "Cadangan atau kondisi sumber menunjukkan perlunya pemantauan, penghematan yang aman, dan persiapan alternatif.",

  [STATUS_KRISIS]:
    "Sistem mendeteksi kondisi yang membutuhkan tindakan segera. Konfirmasi sumber alternatif sebelum mengandalkannya.",

  [STATUS_TIDAK_DITENTUKAN]:
    "Status belum dapat ditentukan karena data belum cukup atau valid, atau kondisi sumber belum diketahui.",
};

export const AKSI_UTAMA_PER_STATUS = {
  [STATUS_AMAN]: "Tanya AIRA Assistant",
  [STATUS_WASPADA]: "Tanya AIRA Assistant",
  [STATUS_KRISIS]: "Cari Titik Air",
  [STATUS_TIDAK_DITENTUKAN]: "Periksa Kembali Data",
};

// ======================================================
// 2. PEMBERSIH DAN NORMALISASI NILAI
// ======================================================

const kosong = (v) =>
  v == null ||
  (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.length === 0);

const teks = (v) =>
  kosong(v)
    ? ""
    : Array.isArray(v)
      ? v.map((x) => String(x).trim()).join("; ")
      : String(v).trim();

const kunci = (v) =>
  teks(v).replace(/\s+/g, " ").toLowerCase();

const daftar = (v) =>
  (Array.isArray(v) ? v.map(String) : teks(v).split(";"))
    .map((x) => x.trim())
    .filter(Boolean);

const yaTidak = (v) => {
  const nilai = kunci(v);

  if (["ya", "yes", "true", "1", "aktif"].includes(nilai)) {
    return "ya";
  }

  if (
    ["tidak", "no", "false", "0", "nonaktif", ""].includes(
      nilai
    )
  ) {
    return "tidak";
  }

  return nilai;
};

// null jika kosong; NaN jika terisi tetapi bukan angka.
const angka = (v) => {
  if (kosong(v)) return null;

  const hasil = Number(
    String(v).trim().replace(",", ".")
  );

  return Number.isFinite(hasil) ? hasil : NaN;
};

const ATURAN_WAJIB_DIKENAL = new Set([
  "ya",
  "tidak",
  "jika mhm aktif",
  "jika mode krisis dan fitur tersedia",
  "ya jika data tidak terverifikasi",
  "jika ada dugaan kontaminasi",
]);

// ======================================================
// 3. VALIDASI DAN NORMALISASI KATALOG
// ======================================================

export function normalisasiKatalog(baris) {
  const statusDikenal = new Map(
    Object.keys(KOLOM_PRIORITAS).map((status) => [
      kunci(status),
      status,
    ])
  );

  const records = [];
  const masalah = [];
  const terlihat = new Set();

  const sumber = Array.isArray(baris) ? baris : [];

  for (const [i, row] of sumber.entries()) {
    const aid = teks(row?.action_id);
    const galat = [];

    if (!aid) {
      galat.push(`baris ${i + 1}: action_id kosong`);
    } else if (terlihat.has(aid)) {
      galat.push(`${aid}: action_id duplikat`);
    }

    if (aid) terlihat.add(aid);

    if (!teks(row?.teks_tindakan)) {
      galat.push(
        `${aid || `baris ${i + 1}`}: teks_tindakan kosong`
      );
    }

    // Validasi status yang berlaku.
    const status = new Set();

    for (const nilaiStatus of daftar(row?.status_berlaku)) {
      const statusNormal = statusDikenal.get(
        kunci(nilaiStatus)
      );

      if (statusNormal) {
        status.add(statusNormal);
      } else {
        galat.push(
          `${aid}: status tidak dikenal '${nilaiStatus}'`
        );
      }
    }

    if (status.size === 0) {
      galat.push(`${aid}: status_berlaku kosong`);
    }

    // Validasi kondisi sumber.
    const kondisi = new Set(
      daftar(row?.kondisi_sumber_berlaku).map(kunci)
    );

    if (kondisi.size === 0) {
      galat.push(
        `${aid}: kondisi_sumber_berlaku kosong`
      );
    }

    for (const nilaiKondisi of kondisi) {
      if (!KONDISI_DIKENAL.includes(nilaiKondisi)) {
        galat.push(
          `${aid}: kondisi tidak dikenal '${nilaiKondisi}'`
        );
      }
    }

    // Validasi aturan wajib.
    const wajib = yaTidak(row?.wajib);

    if (!ATURAN_WAJIB_DIKENAL.has(wajib)) {
      galat.push(
        `${aid}: aturan wajib tidak dikenal '${teks(row?.wajib)}'`
      );
    }

    // Nama kolom ini harus sama dengan Supabase.
    const prioritas = {};

    for (const [statusKunci, kolom] of Object.entries(
      KOLOM_PRIORITAS
    )) {
      const nilai = angka(row?.[kolom]);

      if (Number.isNaN(nilai)) {
        galat.push(
          `${aid}: ${kolom} bukan angka ('${row?.[kolom]}')`
        );

        prioritas[statusKunci] = null;
      } else {
        prioritas[statusKunci] = nilai;
      }
    }

    if (galat.length > 0) {
      masalah.push(...galat);
      continue;
    }

    records.push({
      id: aid,
      kategori: teks(row?.kategori),
      nama: teks(row?.nama_tindakan),
      tindakan: teks(row?.teks_tindakan),
      konteks: teks(row?.konteks_pemicu),

      status,
      kondisi,

      syaratMhm: yaTidak(row?.syarat_mhm) === "ya",
      wajib,

      prioritas,

      cta: teks(row?.cta),
      pesanPengguna: teks(row?.pesan_pengguna),
      catatanKeamanan: teks(row?.catatan_keamanan),
      dasarRujukan: teks(row?.dasar_rujukan),

      aktif: yaTidak(row?.aktif) === "ya",
    });
  }

  return {
    records,
    masalah,
  };
}

// ======================================================
// 4. VALIDASI KELAYAKAN KATALOG
// ======================================================

function katalogLayak(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return false;
  }

  const idsAktif = new Set(
    records
      .filter((record) => record.aktif)
      .map((record) => record.id)
  );

  return Object.values(ID).every((id) =>
    idsAktif.has(id)
  );
}

// ======================================================
// 5. PENGAMBILAN KATALOG DARI SUPABASE
// ======================================================

let cache = {
  records: null,
  waktu: 0,
};

let permintaanKatalog = null;

async function bacaDariSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const kunciPublik =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !kunciPublik) {
    throw new Error(
      "Variabel lingkungan Supabase belum diatur."
    );
  }

  const { createClient } = await import(
    "@supabase/supabase-js"
  );

  const client = createClient(url, kunciPublik, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await client
    .from(TABEL_KATALOG)
    .select("*")
    .order("action_id")
    .limit(1000)
    .abortSignal(
      AbortSignal.timeout(TIMEOUT_SUPABASE_MS)
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      `Tabel '${TABEL_KATALOG}' kosong atau tidak terbaca.`
    );
  }

  return data;
}

export function kosongkanCacheKatalog() {
  cache = {
    records: null,
    waktu: 0,
  };

  permintaanKatalog = null;
}

function ambilKatalogCadangan() {
  const { records, masalah } = normalisasiKatalog(
    KATALOG_FALLBACK
  );

  if (masalah.length > 0) {
    console.warn(
      `[rekomendasi] ${masalah.length} masalah pada katalog fallback:`,
      masalah.slice(0, 10)
    );
  }

  if (!katalogLayak(records)) {
    console.error(
      "[rekomendasi] Katalog fallback belum memenuhi seluruh ID tindakan acuan."
    );
  }

  return {
    records,
    sumber: "cadangan",
  };
}

export async function ambilKatalog({
  paksaCadangan = false,
} = {}) {
  if (paksaCadangan) {
    return ambilKatalogCadangan();
  }

  if (
    cache.records &&
    Date.now() - cache.waktu < TTL_CACHE_MS
  ) {
    return {
      records: cache.records,
      sumber: "cache",
    };
  }

  if (permintaanKatalog) {
    return permintaanKatalog;
  }

  permintaanKatalog = (async () => {
    try {
      const data = await bacaDariSupabase();

      const { records, masalah } = normalisasiKatalog(
        data
      );

      if (!katalogLayak(records)) {
        throw new Error(
          "Katalog Supabase tidak memenuhi seluruh ID tindakan acuan."
        );
      }

      if (masalah.length > 0) {
        console.warn(
          `[rekomendasi] ${masalah.length} masalah data katalog Supabase:`,
          masalah.slice(0, 10)
        );
      }

      cache = {
        records,
        waktu: Date.now(),
      };

      return {
        records,
        sumber: "supabase",
      };
    } catch (err) {
      console.warn(
        "[rekomendasi] Katalog Supabase tidak dapat digunakan:",
        err?.message || err
      );

      if (cache.records && katalogLayak(cache.records)) {
        return {
          records: cache.records,
          sumber: "cache",
        };
      }

      return ambilKatalogCadangan();
    } finally {
      permintaanKatalog = null;
    }
  })();

  return permintaanKatalog;
}

// ======================================================
// 6. MEMBANGUN KONTEKS PENGGUNA
// ======================================================

export function bangunKonteks(masukan, hasil) {
  const valid = hasil?.valid === true;

  const status =
    valid &&
    typeof hasil?.status === "string" &&
    Object.hasOwn(KOLOM_PRIORITAS, hasil.status)
      ? hasil.status
      : STATUS_TIDAK_DITENTUKAN;

  const jumlahMhm = Number(
    masukan?.anggotaMhm ?? masukan?.jumlahAnggotaMhm
  );

  const mhmAktif =
    yaTidak(masukan?.mhm) === "ya" &&
    Number.isInteger(jumlahMhm) &&
    jumlahMhm > 0;

  const kondisi = kunci(
    masukan?.kondisi ??
      masukan?.kondisiSumberAir ??
      masukan?.kondisiSumber
  );

  return {
    valid,
    status,
    kondisi,

    mhmAktif,
    jumlahMhm: mhmAktif ? jumlahMhm : 0,

    sumberAir: teks(
      masukan?.sumberAir ??
        masukan?.sumberAirUtama
    ),

    dugaanKontaminasi:
      masukan?.dugaanKontaminasi === true,

    dataTidakTerverifikasi:
      !valid ||
      status === STATUS_TIDAK_DITENTUKAN ||
      kondisi === "belum diketahui" ||
      kondisi === "",
  };
}

// ======================================================
// 7. ATURAN TINDAKAN WAJIB
// ======================================================

function wajibBerlaku(rec, ctx) {
  switch (rec.wajib) {
    case "ya":
      return true;

    case "jika mhm aktif":
      return ctx.mhmAktif;

    case "jika mode krisis dan fitur tersedia":
      return (
        ctx.status === STATUS_KRISIS &&
        FITUR_NAVIGATION_AIR_TERSEDIA
      );

    case "ya jika data tidak terverifikasi":
      return ctx.dataTidakTerverifikasi;

    case "jika ada dugaan kontaminasi":
      return ctx.dugaanKontaminasi;

    case "tidak":
    default:
      return false;
  }
}

// ======================================================
// 8. PENYUSUNAN KANDIDAT REKOMENDASI
// ======================================================

const bandingkanRekomendasi = (a, b) =>
  Number(!a.wajib) - Number(!b.wajib) ||
  (a.prioritas ?? Infinity) -
    (b.prioritas ?? Infinity) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function susunKatalog(records, ctx) {
  const hasil = [];

  if (!Array.isArray(records)) {
    return hasil;
  }

  for (const rec of records) {
    if (!rec.aktif || !rec.status.has(ctx.status)) {
      continue;
    }

    if (
      !rec.kondisi.has("semua kondisi") &&
      !rec.kondisi.has(ctx.kondisi)
    ) {
      continue;
    }

    if (rec.syaratMhm && !ctx.mhmAktif) {
      continue;
    }

    const wajib = wajibBerlaku(rec, ctx);
    const prioritas = rec.prioritas[ctx.status];

    if (prioritas == null && !wajib) {
      continue;
    }

    hasil.push({
      id: rec.id,
      kategori: rec.kategori,
      nama: rec.nama,

      teks: rec.tindakan
        .replaceAll(
          "{jumlah_mhm}",
          String(ctx.jumlahMhm)
        )
        .replaceAll(
          "{sumber}",
          ctx.sumberAir || "sumber air utama"
        ),

      konteks: rec.konteks,
      prioritas,
      wajib,

      cta: rec.cta,
      pesanPengguna: rec.pesanPengguna,
      catatanKeamanan: rec.catatanKeamanan,
      dasarRujukan: rec.dasarRujukan,
    });
  }

  return hasil.sort(bandingkanRekomendasi);
}

// ======================================================
// 9. PEMILIHAN REKOMENDASI BERBASIS ATURAN
// ======================================================

export function pilihRekomendasi(
  records,
  ctx,
  batas = BATAS_REKOMENDASI
) {
  const batasAman =
    Number.isInteger(batas) && batas > 0
      ? batas
      : BATAS_REKOMENDASI;

  const kandidat = susunKatalog(records, ctx);

  const wajib = kandidat.filter((item) => item.wajib);
  const nonWajib = kandidat.filter((item) => !item.wajib);

  const dipilih = [
    ...wajib,
    ...nonWajib.slice(
      0,
      Math.max(0, batasAman - wajib.length)
    ),
  ];

  if (wajib.length > batasAman) {
    console.warn(
      `[rekomendasi] Jumlah tindakan wajib (${wajib.length}) melebihi batas (${batasAman}). Semua tindakan wajib dipertahankan.`
    );
  }

  return {
    status: ctx.status,
    ringkasan: RINGKASAN_PER_STATUS[ctx.status],
    aksiUtama: AKSI_UTAMA_PER_STATUS[ctx.status],

    items: dipilih.map((item, i) => ({
      urutan: i + 1,
      ...item,
    })),

    tautan: {
      navigationAir: ctx.status === STATUS_KRISIS,
      airaAssistant:
        ctx.status !== STATUS_TIDAK_DITENTUKAN,
    },
  };
}

// ======================================================
// 10. PENGGABUNGAN HASIL AI DAN ATURAN
// ======================================================

export function susunDenganAI({
  wajib,
  nonWajib,
  kandidatAI,
  jumlah,
  hasilAI,
}) {
  const daftarWajib = Array.isArray(wajib) ? wajib : [];
  const daftarNonWajib = Array.isArray(nonWajib)
    ? nonWajib
    : [];

  const daftarKandidatAI = Array.isArray(kandidatAI)
    ? kandidatAI
    : [];

  const idsAI = Array.isArray(hasilAI?.ids)
    ? hasilAI.ids
    : [];

  // AI hanya boleh memilih kandidat yang dikirim kepadanya.
  const petaKandidat = new Map(
    daftarKandidatAI.map((item) => [item.id, item])
  );

  const tambahan = [];

  const batasTambahan =
    Number.isInteger(jumlah) && jumlah > 0
      ? jumlah
      : 0;

  for (const idMentah of idsAI) {
    const id = String(idMentah).trim();
    const item = petaKandidat.get(id);

    if (!item || tambahan.includes(item)) {
      continue;
    }

    tambahan.push(item);

    if (tambahan.length >= batasTambahan) {
      break;
    }
  }

  // Isi kekurangan dengan urutan aturan.
  for (const item of daftarNonWajib) {
    if (tambahan.length >= batasTambahan) {
      break;
    }

    if (!tambahan.includes(item)) {
      tambahan.push(item);
    }
  }

  return [...daftarWajib, ...tambahan].map(
    (item, i) => ({
      urutan: i + 1,
      ...item,
      alasan: hasilAI?.alasan?.[item.id] || null,
    })
  );
}

// ======================================================
// 11. TITIK MASUK RECOMMENDATION SYSTEM
// ======================================================

export async function ambilRekomendasi(
  masukan,
  hasil,
  { pakaiAI = true } = {}
) {
  const ctx = bangunKonteks(masukan, hasil);

  try {
    const { records, sumber } = await ambilKatalog();

    // Rule engine selalu dijalankan terlebih dahulu.
    const aturan = pilihRekomendasi(records, ctx);

    const akhir = {
      ...aturan,
      sumberKatalog: sumber,
      pemilih: "aturan",
    };

    if (!pakaiAI) {
      return akhir;
    }

    // AI tidak digunakan untuk data tidak valid atau status belum ditentukan.
    if (
      !ctx.valid ||
      ctx.status === STATUS_TIDAK_DITENTUKAN ||
      aturan.items.length === 0
    ) {
      return akhir;
    }

    const kandidat = susunKatalog(records, ctx);

    const wajib = kandidat.filter((item) => item.wajib);
    const nonWajib = kandidat.filter((item) => !item.wajib);

    const jumlah = Math.max(
      0,
      BATAS_REKOMENDASI - wajib.length
    );

    if (jumlah === 0 || nonWajib.length <= jumlah) {
      return akhir;
    }

    const kandidatAI = nonWajib.slice(
      0,
      BATAS_KANDIDAT_AI
    );

    try {
      const hasilAI = await pilihTindakanDenganAI(
        hasil,
        masukan,
        {
          wajib,
          kandidat: kandidatAI,
          jumlah,
        }
      );

      const responsValid =
        hasilAI?.ok === true &&
        Array.isArray(hasilAI.ids);

      if (!responsValid) {
        console.warn(
          "[rekomendasi] Respons AI tidak valid. Menggunakan urutan aturan."
        );

        return akhir;
      }

      // PENTING: kandidatAI wajib dikirim ke susunDenganAI.
      const itemsAI = susunDenganAI({
        wajib,
        nonWajib,
        kandidatAI,
        jumlah,
        hasilAI,
      });

      return {
        ...aturan,
        items: itemsAI,
        sumberKatalog: sumber,
        pemilih: `ai:${hasilAI.model || "model-tidak-diketahui"}`,
      };
    } catch (err) {
      console.warn(
        "[rekomendasi] Pemilihan AI gagal. Menggunakan urutan aturan:",
        err?.message || err
      );

      return akhir;
    }
  } catch (err) {
    console.error(
      "[rekomendasi] Gagal menyusun rekomendasi:",
      err
    );

    return {
      status: ctx.status,
      ringkasan: RINGKASAN_PER_STATUS[ctx.status],
      aksiUtama: AKSI_UTAMA_PER_STATUS[ctx.status],
      items: [],

      tautan: {
        navigationAir: ctx.status === STATUS_KRISIS,
        airaAssistant:
          ctx.status !== STATUS_TIDAK_DITENTUKAN,
      },

      sumberKatalog: "tidak-tersedia",
      pemilih: "aturan",
    };
  }
}
