
function kapitalisasiKata(teks = "") {
  return teks
    .toLowerCase()
    .replace(/\b\p{L}/gu, (huruf) => huruf.toUpperCase());
}

export function formatNamaKecamatan(nama = "") {
  return kapitalisasiKata(nama.trim().replace(/\s+/g, " "));
}

export function formatNamaKabupaten(nama = "") {
  const bersih = nama.trim().replace(/\s+/g, " ");
  if (!bersih) return "";

  const bentuk = bersih.match(
    /^(kabupaten\s+administrasi|kabupaten|kab\.?|kota\s+administrasi|kota)\s+(.+)$/i
  );

  const prefix = bentuk?.[1]?.toLowerCase() || "";
  const namaMentah = bentuk ? bentuk[2] : bersih;
  const namaNormal = namaMentah.toLowerCase();

  const namaBaku = {
    "gunung kidul": "Gunungkidul",
    gunungkidul: "Gunungkidul",
  };

  const hasil =
    namaBaku[namaNormal] || kapitalisasiKata(namaMentah);

  if (prefix.startsWith("kabupaten administrasi")) {
    return `Kabupaten Administrasi ${hasil}`;
  }

  if (prefix === "kabupaten" || prefix === "kab" || prefix === "kab.") {
    return `Kabupaten ${hasil}`;
  }

  if (prefix === "kota administrasi") {
    return `Kota Administrasi ${hasil}`;
  }

  if (prefix === "kota") {
    return `Kota ${hasil}`;
  }

  return hasil;
}

export function formatNamaProvinsi(nama = "") {
  const bersih = nama.trim().replace(/\s+/g, " ");
  const namaNormal = bersih.toLowerCase();

  const namaBaku = {
    "di yogyakarta": "Daerah Istimewa Yogyakarta",
    "d.i. yogyakarta": "Daerah Istimewa Yogyakarta",
    "daerah istimewa yogyakarta": "Daerah Istimewa Yogyakarta",
    "dki jakarta": "Daerah Khusus Ibukota Jakarta",
  };

  return namaBaku[namaNormal] || kapitalisasiKata(bersih);
}

export function formatLokasiWilayah(lokasi = "") {
  if (!lokasi || typeof lokasi !== "string") return "";

  const bagian = lokasi.split(",").map((item) => item.trim());

  if (bagian.length !== 3) {
    return bagian.map(kapitalisasiKata).join(", ");
  }

  const [kecamatan, kabupaten, provinsi] = bagian;

  return [
    formatNamaKecamatan(kecamatan),
    formatNamaKabupaten(kabupaten),
    formatNamaProvinsi(provinsi),
  ].join(", ");
}
