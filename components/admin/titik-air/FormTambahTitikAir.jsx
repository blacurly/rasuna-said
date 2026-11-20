"use client";

import { useState } from "react";
import { MapPin, Droplets, Users, Gauge, CheckCircle2 } from "lucide-react";

import Modal from "@/components/admin/titik-air/Modal";
import { Alert } from "@/components/admin/titik-air/PesanUi";
import {
  kolomForm,
  kolomSalah,
  tombolGhost,
  tombolUtama,
} from "@/components/admin/titik-air/titikAirStyles";
import { Field } from "@/components/dashboard/DashboardFormUi";

const JENIS_TITIK_AIR = [
  { value: "public_well", label: "Sumur umum" },
  { value: "water_station", label: "Titik distribusi air" },
];

const KETERSEDIAAN = [
  { value: "available", label: "Tersedia" },
  { value: "limited", label: "Terbatas" },
  { value: "unavailable", label: "Tidak tersedia" },
  { value: "unknown", label: "Belum diketahui" },
];

const fieldAwal = {
  name: "",
  type: "",
  description: "",
  province: "",
  kabupaten: "",
  kecamatan: "",
  village: "",
  address: "",
  latitude: "",
  longitude: "",
  availability: "unknown",
  hours: "",
  access: "",
  quality: "",
  provider: "",
  contact: "",
  phone: "",
  locationHint: "",
  usagePurpose: "",
  source: "",
};

// Data contoh untuk state pratinjau "Tambah berhasil" (sama seperti Figma Make).
const dataContoh = {
  ...fieldAwal,
  name: "Sumur Umum RT 04 Dusun Krajan",
  type: "public_well",
  province: "DI Yogyakarta",
  kabupaten: "Gunungkidul",
  kecamatan: "Rongkop",
  address: "Jl. Raya Rongkop, RT 04, Dusun Krajan",
  latitude: "-8.1325",
  longitude: "110.9381",
  availability: "available",
};

// Kolom wajib diisi (ditandai * di label).
const WAJIB = ["name", "type", "province", "kabupaten", "kecamatan", "address"];

// Memeriksa koordinat. Mengembalikan pesan galat, atau "" jika valid / kosong.
function cekKoordinat(f) {
  const lat = f.latitude.trim();
  const lng = f.longitude.trim();

  if (
    (lat && !Number.isFinite(Number(lat))) ||
    (lng && !Number.isFinite(Number(lng)))
  ) {
    return "Koordinat harus berupa angka yang valid.";
  }
  if (lat && (Number(lat) < -90 || Number(lat) > 90)) {
    return "Latitude harus berada di antara -90 hingga 90.";
  }
  if (lng && (Number(lng) < -180 || Number(lng) > 180)) {
    return "Longitude harus berada di antara -180 hingga 180.";
  }
  return "";
}

// Judul bagian di dalam modal: ikon + garis bawah tipis.
function Bagian({ icon: Icon, title, children }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 border-b border-aira-primary/10 pb-2 font-heading text-lg font-semibold text-aira-primary">
        <Icon className="size-5" /> {title}
      </h3>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// Props:
//  - awal    : "" (kosong) | "invalid" (langsung tampil validasi) | "ok" (data contoh terisi)
//  - onClose : tutup modal
export default function FormTambahTitikAir({ awal = "", onClose }) {
  const [f, setF] = useState(awal === "ok" ? dataContoh : fieldAwal);
  const [sudahPeriksa, setSudahPeriksa] = useState(awal !== "");
  const [galatLokasi, setGalatLokasi] = useState("");

  const ubah = (kunci, nilai) => {
    setF((s) => ({ ...s, [kunci]: nilai }));
    setGalatLokasi("");
  };

  const kosong = WAJIB.filter((k) => !String(f[k] ?? "").trim());
  const galatKoordinat = cekKoordinat(f);
  const siap = sudahPeriksa && kosong.length === 0 && !galatKoordinat;

  const salah = (k) => sudahPeriksa && kosong.includes(k);
  const kelas = (k) => `${kolomForm} ${salah(k) ? kolomSalah : ""}`;
  const petunjuk = (k) =>
    salah(k) ? (
      <span className="mt-1 block text-sm font-medium text-[#c0392b]">
        Wajib diisi
      </span>
    ) : null;

  // Pembantu: satu kolom teks lengkap dengan label + pesan "Wajib diisi".
  const teks = (k, label, placeholder = "", maxLength) => (
    <Field label={label}>
      <input
        value={f[k]}
        onChange={(e) => ubah(k, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={kelas(k)}
      />
      {petunjuk(k)}
    </Field>
  );

  const gunakanLokasiSaya = () => {
    if (!navigator.geolocation) {
      setGalatLokasi("Browser tidak mendukung fitur lokasi.");
      return;
    }
    setGalatLokasi("");
    navigator.geolocation.getCurrentPosition(
      (posisi) => {
        setF((s) => ({
          ...s,
          latitude: String(posisi.coords.latitude),
          longitude: String(posisi.coords.longitude),
        }));
      },
      () => {
        setGalatLokasi(
          "Lokasi tidak berhasil diperoleh. Periksa izin lokasi browser."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const jenisLabel =
    JENIS_TITIK_AIR.find((j) => j.value === f.type)?.label || "Belum dipilih";
  const ketersediaanLabel =
    KETERSEDIAAN.find((k) => k.value === f.availability)?.label ||
    "Belum diketahui";
  const alamatLengkap = [
    f.address,
    f.village,
    f.kecamatan,
    f.kabupaten,
    f.province,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Modal
      title="Tambah titik air"
      onClose={onClose}
      onSubmit={() => setSudahPeriksa(true)}
      footer={
        <>
          <button type="button" onClick={onClose} className={tombolGhost}>
            Tutup
          </button>
          <button type="submit" className={tombolUtama}>
            Periksa Data
          </button>
        </>
      }
    >
      <p className="text-base text-aira-text/75">
        Tambahkan informasi titik air baru ke dalam direktori AIRA. Pastikan
        informasi lokasi dan kondisi air sesuai dengan data yang diperoleh.
      </p>

      {sudahPeriksa && kosong.length > 0 && (
        <Alert>
          {`Lengkapi ${kosong.length} kolom wajib yang ditandai merah.`}
        </Alert>
      )}
      {sudahPeriksa && kosong.length === 0 && galatKoordinat && (
        <Alert>{galatKoordinat}</Alert>
      )}
      {galatLokasi && <Alert>{galatLokasi}</Alert>}

      {siap && (
        <div
          role="status"
          className="rounded-[16px] border border-aira-sage bg-aira-sage/30 p-4 text-base text-aira-primary-dark"
        >
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-5" /> Data siap ditambahkan
          </p>
          <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[150px_1fr]">
            <dt className="font-semibold">Nama</dt>
            <dd>{f.name}</dd>
            <dt className="font-semibold">Jenis</dt>
            <dd>{jenisLabel}</dd>
            <dt className="font-semibold">Alamat</dt>
            <dd>{alamatLengkap}</dd>
            <dt className="font-semibold">Ketersediaan</dt>
            <dd>{ketersediaanLabel}</dd>
            <dt className="font-semibold">Koordinat</dt>
            <dd>
              {f.latitude && f.longitude
                ? `${f.latitude}, ${f.longitude}`
                : "Belum diisi"}
            </dd>
          </dl>
          {/* Catatan jujur untuk tim: penyimpanan ke database belum ada. */}
          <p className="mt-3 text-sm text-aira-text/70">
            Form tervalidasi di frontend. Data belum disimpan ke database karena
            Server Action untuk tambah titik air belum terhubung.
          </p>
        </div>
      )}

      <Bagian icon={Droplets} title="Identitas titik air">
        {teks("name", "Nama titik air *", "Contoh: Sumur Umum RT 04", 200)}

        <Field label="Jenis sumber air *">
          <select
            value={f.type}
            onChange={(e) => ubah("type", e.target.value)}
            className={kelas("type")}
          >
            <option value="">Pilih jenis</option>
            {JENIS_TITIK_AIR.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
          {petunjuk("type")}
        </Field>

        <div className="sm:col-span-2">
          <Field label="Deskripsi titik air">
            <textarea
              value={f.description}
              onChange={(e) => ubah("description", e.target.value)}
              rows={3}
              maxLength={1000}
              className={kolomForm}
            />
          </Field>
        </div>
      </Bagian>

      <Bagian icon={MapPin} title="Lokasi">
        {teks("province", "Provinsi *", "Nama provinsi")}
        {teks("kabupaten", "Kabupaten / Kota *", "Nama kabupaten atau kota")}
        {teks("kecamatan", "Kecamatan *", "Nama kecamatan")}
        {teks("village", "Desa / Kelurahan")}

        <div className="sm:col-span-2">
          {teks("address", "Alamat lengkap *", "Jalan, RT/RW, dusun", 500)}
        </div>

        <Field label="Latitude">
          <input
            type="number"
            step="any"
            value={f.latitude}
            onChange={(e) => ubah("latitude", e.target.value)}
            placeholder="-8.1325"
            className={kolomForm}
          />
        </Field>

        <Field label="Longitude">
          <input
            type="number"
            step="any"
            value={f.longitude}
            onChange={(e) => ubah("longitude", e.target.value)}
            placeholder="110.9381"
            className={kolomForm}
          />
        </Field>

        {/* Fitur tambahan dari repo (tidak ada di Figma): isi koordinat otomatis. */}
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={gunakanLokasiSaya}
            className="text-sm font-semibold text-aira-primary hover:underline"
          >
            Gunakan lokasi saya
          </button>
        </div>
      </Bagian>

      <Bagian icon={Gauge} title="Status & operasional">
        <Field label="Ketersediaan air">
          <select
            value={f.availability}
            onChange={(e) => ubah("availability", e.target.value)}
            className={kolomForm}
          >
            {KETERSEDIAAN.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>

        {teks("hours", "Jam operasional", "", 150)}
        {teks("access", "Informasi akses")}
        {teks("quality", "Informasi kualitas air")}
        {teks("usagePurpose", "Tujuan penggunaan")}
      </Bagian>

      <Bagian icon={Users} title="Pengelola & sumber informasi">
        {teks("provider", "Nama pengelola")}
        {teks("contact", "Nama kontak")}
        <Field label="Nomor telepon">
          <input
            type="tel"
            value={f.phone}
            onChange={(e) => ubah("phone", e.target.value)}
            placeholder="08xxxxxxxxxx"
            className={kolomForm}
          />
        </Field>
        {teks("locationHint", "Petunjuk lokasi")}

        <div className="sm:col-span-2">{teks("source", "Sumber informasi")}</div>
      </Bagian>

      <p className="text-sm text-aira-text/65">Kolom bertanda * wajib diisi.</p>
    </Modal>
  );
}
