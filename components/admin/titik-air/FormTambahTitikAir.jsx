"use client";

import { useState } from "react";
import {
  MapPin,
  Droplets,
  Building2,
  Info,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import Overlay from "@/components/admin/titik-air/Overlay";
import { Field, inputCls } from "@/components/dashboard/DashboardFormUi";

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

export default function FormTambahTitikAir({ onClose }) {
  const [form, setForm] = useState(fieldAwal);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setError("");
    setPreview(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.type ||
      !form.province.trim() ||
      !form.kabupaten.trim() ||
      !form.kecamatan.trim() ||
      !form.address.trim()
    ) {
      setError(
        "Mohon lengkapi nama, jenis titik air, provinsi, kabupaten/kota, kecamatan, dan alamat."
      );
      return;
    }

    if (
      (form.latitude && !Number.isFinite(Number(form.latitude))) ||
      (form.longitude && !Number.isFinite(Number(form.longitude)))
    ) {
      setError("Koordinat harus berupa angka yang valid.");
      return;
    }

    if (
      form.latitude &&
      (Number(form.latitude) < -90 || Number(form.latitude) > 90)
    ) {
      setError("Latitude harus berada di antara -90 hingga 90.");
      return;
    }

    if (
      form.longitude &&
      (Number(form.longitude) < -180 || Number(form.longitude) > 180)
    ) {
      setError("Longitude harus berada di antara -180 hingga 180.");
      return;
    }

    setPreview(true);
  };

  const ambilLokasi = () => {
    if (!navigator.geolocation) {
      setError("Browser tidak mendukung fitur lokasi.");
      return;
    }

    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
      },
      () => {
        setError(
          "Lokasi tidak berhasil diperoleh. Periksa izin lokasi browser."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  const jenisLabel =
    JENIS_TITIK_AIR.find((item) => item.value === form.type)?.label ||
    "Belum dipilih";

  const ketersediaanLabel =
    KETERSEDIAAN.find(
      (item) => item.value === form.availability
    )?.label || "Belum diketahui";

  const alamatLengkap = [
    form.address,
    form.village,
    form.kecamatan,
    form.kabupaten,
    form.province,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Overlay
      onClose={onClose}
      title="Tambah titik air"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* INTRO */}
        <div>
          <p className="text-sm leading-relaxed text-aira-text/65">
            Tambahkan informasi titik air baru ke dalam direktori
            AIRA. Pastikan informasi lokasi dan kondisi air sesuai
            dengan data yang diperoleh.
          </p>
        </div>

        {/* =============================== */}
        {/* 01 IDENTITAS */}
        {/* =============================== */}

        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-aira-primary/10 pb-3">
            <Droplets className="size-5 text-aira-primary" />
            <h3 className="font-semibold text-aira-primary">
              Identitas titik air
            </h3>
          </div>

          <Field label="Nama titik air" hint="Wajib diisi">
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              maxLength={200}
              className={inputCls}
              placeholder="Contoh: Sumur Umum RW 03"
            />
          </Field>

          <Field label="Jenis sumber air" hint="Wajib diisi">
            <select
              value={form.type}
              onChange={(e) => updateField("type", e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Pilih jenis sumber air</option>
              {JENIS_TITIK_AIR.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Deskripsi titik air">
            <textarea
              value={form.description}
              onChange={(e) =>
                updateField("description", e.target.value)
              }
              rows={3}
              maxLength={1000}
              className={inputCls}
              placeholder="Deskripsi singkat mengenai titik air..."
            />
          </Field>
        </section>

        {/* =============================== */}
        {/* 02 LOKASI */}
        {/* =============================== */}

        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-aira-primary/10 pb-3">
            <MapPin className="size-5 text-aira-primary" />
            <h3 className="font-semibold text-aira-primary">
              Lokasi titik air
            </h3>
          </div>

          <Field label="Provinsi" hint="Wajib diisi">
            <input
              value={form.province}
              onChange={(e) =>
                updateField("province", e.target.value)
              }
              required
              className={inputCls}
              placeholder="Nama provinsi"
            />
          </Field>

          <Field label="Kabupaten / Kota" hint="Wajib diisi">
            <input
              value={form.kabupaten}
              onChange={(e) =>
                updateField("kabupaten", e.target.value)
              }
              required
              className={inputCls}
              placeholder="Nama kabupaten atau kota"
            />
          </Field>

          <Field label="Kecamatan" hint="Wajib diisi">
            <input
              value={form.kecamatan}
              onChange={(e) =>
                updateField("kecamatan", e.target.value)
              }
              required
              className={inputCls}
              placeholder="Nama kecamatan"
            />
          </Field>

          <Field label="Desa / Kelurahan">
            <input
              value={form.village}
              onChange={(e) =>
                updateField("village", e.target.value)
              }
              className={inputCls}
              placeholder="Nama desa atau kelurahan"
            />
          </Field>

          <Field label="Alamat lengkap" hint="Wajib diisi">
            <textarea
              value={form.address}
              onChange={(e) =>
                updateField("address", e.target.value)
              }
              required
              rows={3}
              maxLength={500}
              className={inputCls}
              placeholder="Nama jalan, RT/RW, patokan lokasi, dan sebagainya"
            />
          </Field>

          {/* KOORDINAT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-aira-text">
                Koordinat lokasi
              </p>

              <button
                type="button"
                onClick={ambilLokasi}
                className="text-xs font-semibold text-aira-primary hover:underline"
              >
                Gunakan lokasi saya
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude">
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    updateField("latitude", e.target.value)
                  }
                  className={inputCls}
                  placeholder="-6.XXXX"
                />
              </Field>

              <Field label="Longitude">
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    updateField("longitude", e.target.value)
                  }
                  className={inputCls}
                  placeholder="107.XXXX"
                />
              </Field>
            </div>

            <p className="text-xs leading-relaxed text-aira-text/55">
              Koordinat dapat diisi manual atau menggunakan lokasi
              perangkat. Pastikan pin berada pada lokasi titik air.
            </p>
          </div>
        </section>

        {/* =============================== */}
        {/* 03 OPERASIONAL */}
        {/* =============================== */}

        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-aira-primary/10 pb-3">
            <Droplets className="size-5 text-aira-primary" />
            <h3 className="font-semibold text-aira-primary">
              Informasi operasional
            </h3>
          </div>

          <Field label="Ketersediaan air">
            <select
              value={form.availability}
              onChange={(e) =>
                updateField("availability", e.target.value)
              }
              className={inputCls}
            >
              {KETERSEDIAAN.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Jam operasional">
            <input
              value={form.hours}
              onChange={(e) => updateField("hours", e.target.value)}
              maxLength={150}
              className={inputCls}
              placeholder="Contoh: Setiap hari, 06.00–18.00 WIB"
            />
          </Field>

          <Field label="Informasi akses">
            <textarea
              value={form.access}
              onChange={(e) => updateField("access", e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Biaya, antrean, aturan penggunaan, dan akses..."
            />
          </Field>

          <Field label="Informasi kualitas air">
            <textarea
              value={form.quality}
              onChange={(e) => updateField("quality", e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Informasi kondisi atau kualitas air jika diketahui..."
            />
          </Field>

          <Field label="Tujuan penggunaan">
            <input
              value={form.usagePurpose}
              onChange={(e) =>
                updateField("usagePurpose", e.target.value)
              }
              className={inputCls}
              placeholder="Contoh: Kebutuhan rumah tangga"
            />
          </Field>
        </section>

        {/* =============================== */}
        {/* 04 PENGELOLA */}
        {/* =============================== */}

        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-aira-primary/10 pb-3">
            <Building2 className="size-5 text-aira-primary" />
            <h3 className="font-semibold text-aira-primary">
              Pengelola & sumber informasi
            </h3>
          </div>

          <Field label="Nama pengelola">
            <input
              value={form.provider}
              onChange={(e) => updateField("provider", e.target.value)}
              className={inputCls}
              placeholder="Instansi, komunitas, atau pengelola"
            />
          </Field>

          <Field label="Nama kontak">
            <input
              value={form.contact}
              onChange={(e) => updateField("contact", e.target.value)}
              className={inputCls}
              placeholder="Nama orang yang dapat dihubungi"
            />
          </Field>

          <Field label="Nomor telepon">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={inputCls}
              placeholder="08xxxxxxxxxx"
            />
          </Field>

          <Field label="Petunjuk lokasi">
            <textarea
              value={form.locationHint}
              onChange={(e) =>
                updateField("locationHint", e.target.value)
              }
              rows={2}
              className={inputCls}
              placeholder="Petunjuk untuk menemukan lokasi..."
            />
          </Field>

          <Field label="Sumber informasi">
            <textarea
              value={form.source}
              onChange={(e) => updateField("source", e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Contoh: Observasi langsung, pengelola setempat..."
            />
          </Field>
        </section>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* PREVIEW */}
        {preview && (
          <section className="space-y-3 rounded-2xl border border-aira-sage bg-aira-sage/20 p-4">
            <div className="flex items-center gap-2 text-aira-primary">
              <CheckCircle2 className="size-5 shrink-0" />
              <p className="font-semibold">
                Validasi form berhasil
              </p>
            </div>

            <div className="space-y-1 text-sm">
              <p className="font-semibold">{form.name}</p>
              <p>{jenisLabel}</p>
              <p>{alamatLengkap}</p>
              <p>
                Ketersediaan: {ketersediaanLabel}
              </p>

              {form.latitude && form.longitude && (
                <p>
                  Koordinat: {form.latitude}, {form.longitude}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-white p-3 text-xs leading-relaxed text-aira-text/70">
              <Info className="mb-1 inline size-3.5" /> Form berhasil
              divalidasi secara frontend. Data belum disimpan ke database
              karena Server Action backend belum terhubung.
            </div>
          </section>
        )}

        {/* FOOTER */}
        <div className="space-y-3 border-t border-aira-primary/10 pt-5">
          <button
            type="submit"
            className="min-h-[52px] w-full rounded-full bg-aira-primary px-6 py-3 font-semibold text-white shadow-soft transition-colors hover:bg-aira-primary-dark"
          >
            Periksa Data
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] w-full rounded-full px-6 py-3 font-semibold text-aira-primary transition-colors hover:bg-aira-primary/10"
          >
            Tutup
          </button>
        </div>
      </form>
    </Overlay>
  );
} 