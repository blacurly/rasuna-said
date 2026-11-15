import {
  KEBUTUHAN_PER_ORANG_LITER_HARI,
  TAMBAHAN_AIR_MHM_PER_ORANG_LITER_HARI,
  STATUS_AMAN,
  STATUS_KRISIS,
  STATUS_TIDAK_DITENTUKAN,
  STATUS_WASPADA,
  hitungKetahananAir,
} from "@/services/calculatorService";

export const BASIC_PER_ORANG = KEBUTUHAN_PER_ORANG_LITER_HARI;
export const MHM_PER_ORANG = TAMBAHAN_AIR_MHM_PER_ORANG_LITER_HARI;

export const MIN_ANGGOTA = 1;
export const MAX_ANGGOTA = 30;
export const MAX_KAPASITAS_LITER = 100000;
export const MAX_LUAS_ATAP_M2 = 1000;

export const SUMBER_AIR = [
  "PDAM / Air Perpipaan",
  "Sumur Gali/Bor",
  "Air Hujan",
  "Mata Air / Posko",
];

export const KONDISI_SUMBER_AIR = [
  "Normal",
  "Terbatas",
  "Tidak Berfungsi",
  "Belum diketahui",
];

export const INPUT_AWAL = {
  lokasi: "",
  anggota: 1,
  sumberAir: SUMBER_AIR[0],
  kondisi: "Normal",
  kapasitas: "0",
  persen: 0,
  mhm: false,
  anggotaMhm: 0,
  luasAtap: "",
};

const KONDISI_KE_SERVICE = {
  "Tidak Berfungsi": "Tidak berfungsi",
};

const STATUS_KEY = {
  [STATUS_AMAN]: "aman",
  [STATUS_WASPADA]: "waspada",
  [STATUS_KRISIS]: "krisis",
  [STATUS_TIDAK_DITENTUKAN]: "belum",
};

const kosong = (value) =>
  value == null ||
  (typeof value === "string" && value.trim() === "");

const keAngka = (value) =>
  kosong(value) ? NaN : Number(value);

function normalisasiInput(input) {
  return input &&
    typeof input === "object" &&
    !Array.isArray(input)
    ? { ...INPUT_AWAL, ...input }
    : { ...INPUT_AWAL };
}

export function validasiInput(input) {
  const masukan = normalisasiInput(input);
  const errors = {};

  const anggota = keAngka(masukan.anggota);
  const kapasitas = keAngka(masukan.kapasitas);
  const persen = keAngka(masukan.persen);
  const anggotaMhm = keAngka(masukan.anggotaMhm);

  const anggotaOk =
    Number.isInteger(anggota) &&
    anggota >= MIN_ANGGOTA &&
    anggota <= MAX_ANGGOTA;

  if (!anggotaOk) {
    errors.anggota =
      "Jumlah anggota keluarga harus 1 sampai 30.";
  }

  if (
    !(
      Number.isFinite(kapasitas) &&
      kapasitas > 0 &&
      kapasitas <= MAX_KAPASITAS_LITER
    )
  ) {
    errors.kapasitas =
      "Kapasitas penampungan harus lebih dari 0 dan paling banyak 100.000 liter.";
  }

  if (
    !(Number.isFinite(persen) && persen >= 0 && persen <= 100)
  ) {
    errors.persen =
      "Persentase volume air harus berada di antara 0% dan 100%.";
  }

  if (!kosong(masukan.luasAtap)) {
    const luas = Number(masukan.luasAtap);

    if (
      !(
        Number.isFinite(luas) &&
        luas >= 0 &&
        luas <= MAX_LUAS_ATAP_M2
      )
    ) {
      errors.luasAtap =
        "Luas atap harus antara 0 dan 1.000 m2.";
    }
  }

  if (!SUMBER_AIR.includes(masukan.sumberAir)) {
    errors.sumberAir = "Sumber air utama tidak valid.";
  }

  if (!KONDISI_SUMBER_AIR.includes(masukan.kondisi)) {
    errors.kondisi = "Kondisi sumber air tidak valid.";
  }

  if (masukan.mhm) {
    if (!Number.isInteger(anggotaMhm) || anggotaMhm < 1) {
      errors.mhm =
        "Jumlah anggota yang membutuhkan MHM minimal 1 saat MHM diaktifkan.";
    } else if (anggotaOk && anggotaMhm > anggota) {
      errors.mhm =
        "Jumlah anggota yang membutuhkan MHM tidak boleh melebihi jumlah anggota keluarga.";
    }
  } else if (anggotaMhm !== 0) {
    errors.mhm =
      "Jumlah anggota MHM harus 0 saat MHM dinonaktifkan.";
  }

  const daftar = Object.values(errors);

  return {
    valid: daftar.length === 0,
    errors,
    daftar,
  };
}

export function hitungVolumeSaatIni(kapasitas, persen) {
  const k = keAngka(kapasitas);
  const p = keAngka(persen);

  if (
    !Number.isFinite(k) ||
    k <= 0 ||
    !Number.isFinite(p)
  ) {
    return 0;
  }

  return (k * p) / 100;
}

// Curah hujan diterima dari server melalui parameter kedua.
// Nilai curah hujan menggunakan satuan mm/bulan.
export function jalankanKalkulator(input, curahHujanMm = null) {
  const masukan = normalisasiInput(input);
  const cek = validasiInput(masukan);

  if (!cek.valid) {
    return {
      valid: false,
      errors: cek.daftar,
      status: STATUS_TIDAK_DITENTUKAN,
      statusKey: "belum",
      alasanStatus: "Data tidak lengkap atau tidak valid.",
      potensiPanenAirHujanLiter: null,
      curahHujanMmPerBulan: curahHujanMm,
      wilayah: masukan.lokasi || "",
      waktuPerhitunganUtc: new Date().toISOString(),
    };
  }

  const anggota = Number(masukan.anggota);

  const volume = hitungVolumeSaatIni(
    masukan.kapasitas,
    masukan.persen
  );

  const luasAtap = kosong(masukan.luasAtap)
    ? null
    : Number(masukan.luasAtap);

  const hasil = hitungKetahananAir({
    jumlahAnggota: anggota,
    sumberAirUtama: masukan.sumberAir,
    kondisiSumberAir:
      KONDISI_KE_SERVICE[masukan.kondisi] ??
      masukan.kondisi,
    volumeCadanganLiter: volume,
    luasAtapM2: luasAtap,
    curahHujanMm,
    kebutuhanMhm: Boolean(masukan.mhm),
    jumlahAnggotaMhm: masukan.mhm
      ? Number(masukan.anggotaMhm)
      : 0,
  });

  return {
    ...hasil,
    statusKey: STATUS_KEY[hasil.status] ?? "belum",
    potensiPanenAirHujanLiter:
      hasil.potensiPanenAirHujanLiter,
    curahHujanMmPerBulan: curahHujanMm,
    wilayah: masukan.lokasi || "",
  };
}