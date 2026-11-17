const CACHE_TTL = 24 * 60 * 60 * 1000;
const cacheCurahHujan = new Map();

const TAHUN_MULAI = 1991;
const TAHUN_AKHIR = 2020;

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo gagal: HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data?.error) {
    throw new Error(data.reason || "Data cuaca tidak tersedia.");
  }

  return data;
}

function normalisasiNama(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(kabupaten|kab|kota|kecamatan|kec|indonesia)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pecahLokasi(lokasi) {
  return lokasi
    .split(",")
    .map((bagian) => bagian.trim())
    .filter(Boolean);
}

function buatKandidatPencarian(lokasi) {
  const bagian = pecahLokasi(lokasi);
  const kandidat = [];

  if (bagian.length > 0) {
    kandidat.push(bagian[0]);
  }

  if (bagian.length > 1) {
    kandidat.push(`${bagian[0]}, ${bagian[1]}`);
    kandidat.push(bagian[1]);
  }

  if (bagian.length > 2) {
    kandidat.push(`${bagian[1]}, ${bagian[2]}`);
  }

  kandidat.push(lokasi);

  return [...new Set(kandidat.filter(Boolean))];
}

function cocokDenganLokasi(tempat, lokasi) {
  const bagianInput = pecahLokasi(lokasi)
    .map(normalisasiNama)
    .filter(Boolean);

  const bagianHasil = [
    tempat.name,
    tempat.admin1,
    tempat.admin2,
    tempat.admin3,
    tempat.admin4,
    tempat.country,
  ]
    .map(normalisasiNama)
    .filter(Boolean);

  const gabunganHasil = bagianHasil.join(" ");

  // Pastikan seluruh komponen lokasi yang dimasukkan
  // ditemukan pada data administratif hasil geocoding.
  return bagianInput.every((bagian) =>
    gabunganHasil.includes(bagian)
  );
}

// Mencari koordinat lokasi. Jika kecamatan tidak ditemukan di layanan geocoding,
// dipakai kabupaten/kota dan provinsi (curah hujan bulanan tidak berbeda jauh
// antar kecamatan dalam satu kabupaten/kota).
async function cariKoordinat(lokasi) {
  const langsung = await cariKoordinatLangsung(lokasi);
  if (langsung) return langsung;

  const bagian = pecahLokasi(lokasi);
  if (bagian.length >= 3) {
    return cariKoordinatLangsung(bagian.slice(1).join(", "));
  }

  return null;
}

async function cariKoordinatLangsung(lokasi) {
  const kandidat = buatKandidatPencarian(lokasi);

  for (const nama of kandidat) {
    try {
      const url = new URL(
        "https://geocoding-api.open-meteo.com/v1/search"
      );

      url.searchParams.set("name", nama);
      url.searchParams.set("count", "20");
      url.searchParams.set("language", "id");
      url.searchParams.set("format", "json");
      url.searchParams.set("countryCode", "ID");

      const data = await fetchJson(url.toString());
      const hasil = Array.isArray(data?.results)
        ? data.results
        : [];

      if (hasil.length === 0) continue;

      const tempatCocok = hasil.find((item) => {
        return (
          item.country_code === "ID" &&
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude) &&
          cocokDenganLokasi(item, lokasi)
        );
      });

      if (!tempatCocok) {
        console.info(
          `[curahHujanService] Hasil pencarian "${nama}" tidak cocok dengan lokasi input.`
        );
        continue;
      }

      return {
        latitude: tempatCocok.latitude,
        longitude: tempatCocok.longitude,
        nama: [
          tempatCocok.name,
          tempatCocok.admin3,
          tempatCocok.admin2,
          tempatCocok.admin1,
          tempatCocok.country,
        ]
          .filter(Boolean)
          .join(", "),
        tingkatLokasi: tempatCocok.name,
      };
    } catch (error) {
      console.warn(
        `[curahHujanService] Geocoding gagal untuk ${nama}:`,
        error.message
      );
    }
  }

  return null;
}

async function ambilDataHistoris(latitude, longitude) {
  const url = new URL(
    "https://archive-api.open-meteo.com/v1/archive"
  );

  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("start_date", `${TAHUN_MULAI}-01-01`);
  url.searchParams.set("end_date", `${TAHUN_AKHIR}-12-31`);
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("timezone", "Asia/Jakarta");
  url.searchParams.set("precipitation_unit", "mm");

  return fetchJson(url.toString());
}

function hitungRataRataBulanan(data) {
  const tanggal = data?.daily?.time;
  const curahHujan = data?.daily?.precipitation_sum;

  if (
    !Array.isArray(tanggal) ||
    !Array.isArray(curahHujan) ||
    tanggal.length === 0 ||
    tanggal.length !== curahHujan.length
  ) {
    return null;
  }

  const totalPerBulan = new Map();

  for (let i = 0; i < tanggal.length; i += 1) {
    const tanggalHari = tanggal[i];
    const nilaiHujan = curahHujan[i];

    if (
      typeof tanggalHari !== "string" ||
      typeof nilaiHujan !== "number" ||
      !Number.isFinite(nilaiHujan)
    ) {
      continue;
    }

    const bulan = tanggalHari.slice(0, 7);

    totalPerBulan.set(
      bulan,
      (totalPerBulan.get(bulan) || 0) + nilaiHujan
    );
  }

  if (totalPerBulan.size === 0) return null;

  const total = [...totalPerBulan.values()].reduce(
    (jumlah, nilai) => jumlah + nilai,
    0
  );

  return Number((total / totalPerBulan.size).toFixed(2));
}

export async function ambilRataRataCurahHujan(lokasi) {
  if (typeof lokasi !== "string" || !lokasi.trim()) {
    return null;
  }

  const lokasiBersih = lokasi.trim();
  const cacheKey = lokasiBersih.toLowerCase();

  const cache = cacheCurahHujan.get(cacheKey);

  if (cache && Date.now() - cache.waktu < CACHE_TTL) {
    return cache.data;
  }

  try {
    console.info(
      "[curahHujanService] Mencari koordinat:",
      lokasiBersih
    );

    const koordinat = await cariKoordinat(lokasiBersih);

    if (!koordinat) {
      console.warn(
        "[curahHujanService] Lokasi tidak dapat diverifikasi:",
        lokasiBersih
      );

      return null;
    }

    console.info(
      "[curahHujanService] Koordinat terverifikasi:",
      koordinat
    );

    const dataHistoris = await ambilDataHistoris(
      koordinat.latitude,
      koordinat.longitude
    );

    const rataRataMm = hitungRataRataBulanan(dataHistoris);

    if (rataRataMm === null) {
      console.warn(
        "[curahHujanService] Data curah hujan kosong:",
        koordinat.nama
      );

      return null;
    }

    const hasil = {
      lokasi: lokasiBersih,
      namaLokasiDitemukan: koordinat.nama,
      latitude: koordinat.latitude,
      longitude: koordinat.longitude,
      curahHujanMmPerBulan: rataRataMm,
      potensiData: "historis",
      periodeData: `${TAHUN_MULAI}-${TAHUN_AKHIR}`,
      sumberData: "Open-Meteo Historical Weather API",
    };

    cacheCurahHujan.set(cacheKey, {
      waktu: Date.now(),
      data: hasil,
    });

    console.info(
      "[curahHujanService] Hasil curah hujan:",
      hasil
    );

    return hasil;
  } catch (error) {
    console.error(
      "[curahHujanService] Gagal mengambil data:",
      error.message
    );

    return null;
  }
}
