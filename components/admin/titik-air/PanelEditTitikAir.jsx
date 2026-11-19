"use client";

import { useState } from "react";
import { Clock, Info, AlertCircle } from "lucide-react";

import Overlay from "@/components/admin/titik-air/Overlay";
import { VerificationBadge } from "@/components/StatusBadge";
import { Field, inputCls } from "@/components/dashboard/DashboardFormUi";

export const KETERSEDIAAN = [
  "Tersedia",
  "Terbatas",
  "Tidak Tersedia",
  "Belum Diketahui",
];

const SUMBER_PEMBARUAN = [
  "Pantauan langsung admin",
  "Pengelola setempat",
  "Laporan warga",
  "Lainnya",
];

export default function PanelEditTitikAir({
  titik,
  onClose,
  onSimpan,
  sedangMenyimpan = false,
}) {
  const [nama, setNama] = useState(titik?.name || "");
  const [alamat, setAlamat] = useState(titik?.address || "");
  const [ketersediaan, setKetersediaan] = useState(
    titik?.availability || "Belum Diketahui"
  );
  const [jam, setJam] = useState(titik?.hours || "");
  const [catatan, setCatatan] = useState(titik?.note || "");
  const [sumber, setSumber] = useState("");
  const [pesanError, setPesanError] = useState("");

  const berikutnya = {
    name: nama.trim(),
    address: alamat.trim(),
    availability: ketersediaan,
    hours: jam.trim() || "Belum diketahui",
    note: catatan.trim(),
  };

  const berubah =
    berikutnya.name !== (titik?.name || "") ||
    berikutnya.address !== (titik?.address || "") ||
    berikutnya.availability !==
      (titik?.availability || "Belum Diketahui") ||
    berikutnya.hours !== (titik?.hours || "") ||
    berikutnya.note !== (titik?.note || "");

  const bisaSimpan =
    berubah &&
    !!berikutnya.name &&
    !!berikutnya.address &&
    !!sumber &&
    !sedangMenyimpan;

  const latitude = Number(titik?.latitude);
  const longitude = Number(titik?.longitude);

  const adaKoordinat =
    titik?.latitude !== null &&
    titik?.latitude !== undefined &&
    titik?.longitude !== null &&
    titik?.longitude !== undefined &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const waktuDiperbarui = (titik?.updated || "Belum diketahui").replace(
    /^Diperbarui\s*/,
    ""
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPesanError("");

    if (!berikutnya.name || !berikutnya.address || !sumber) {
      setPesanError(
        "Nama titik air, alamat, dan sumber pembaruan wajib diisi."
      );
      return;
    }

    if (!berubah) {
      setPesanError("Belum ada perubahan yang perlu disimpan.");
      return;
    }

    try {
      const hasil = await onSimpan(titik.id, berikutnya, sumber);

      if (!hasil?.success) {
        setPesanError(
          hasil?.message || "Perubahan belum berhasil disimpan."
        );
      }
    } catch (error) {
      console.error("Kesalahan saat menyimpan titik air:", error);
      setPesanError(
        error?.message || "Terjadi kesalahan saat menyimpan perubahan."
      );
    }
  };

  return (
    <Overlay
      onClose={sedangMenyimpan ? () => {} : onClose}
      title="Edit titik air"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <h3 className="font-heading text-xl font-bold leading-snug text-aira-primary">
            {titik?.name || "Titik air"}
          </h3>

          <p className="text-sm text-aira-text/65">
            {titik?.type || "Jenis belum diketahui"}
            {titik?.area ? `, ${titik.area}` : ""}
          </p>

          <div className="mt-3">
            <VerificationBadge v="Terverifikasi" />
          </div>
        </div>

        <p className="flex items-center gap-2 text-sm text-aira-text/70">
          <Clock className="size-4" />
          Terakhir diperbarui {waktuDiperbarui}
        </p>

        <dl className="space-y-2 rounded-2xl bg-aira-bg p-4 text-sm">
          <div>
            <dt className="font-semibold">Alamat lengkap</dt>
            <dd className="text-aira-text/80">
              {titik?.address || "Informasi alamat belum tersedia"}
            </dd>
          </div>

          <div>
            <dt className="font-semibold">Pengelola / kontak</dt>
            <dd className="text-aira-text/80">
              {[titik?.provider, titik?.contact]
                .filter(Boolean)
                .join(", ") || "Belum tersedia"}
              {titik?.phone ? ` (${titik.phone})` : ""}
            </dd>
          </div>

          <div>
            <dt className="font-semibold">Koordinat</dt>
            <dd className="text-aira-text/80">
              {adaKoordinat
                ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                : "Koordinat belum tersedia"}
            </dd>
          </div>
        </dl>

        <Field label="Nama titik air">
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            maxLength={200}
            disabled={sedangMenyimpan}
            className={inputCls}
          />
        </Field>

        <Field label="Alamat / lokasi">
          <input
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            required
            maxLength={500}
            disabled={sedangMenyimpan}
            className={inputCls}
          />
        </Field>

        <Field label="Ketersediaan air">
          <div className="grid grid-cols-2 gap-2">
            {KETERSEDIAAN.map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setKetersediaan(k)}
                aria-pressed={ketersediaan === k}
                disabled={sedangMenyimpan}
                className={`min-h-[48px] rounded-2xl border-2 px-3 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  ketersediaan === k
                    ? "border-aira-primary bg-aira-primary/10 text-aira-primary"
                    : "border-aira-primary/15 hover:bg-aira-bg"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Jam operasional">
          <input
            value={jam}
            onChange={(e) => setJam(e.target.value)}
            maxLength={150}
            disabled={sedangMenyimpan}
            className={inputCls}
            placeholder="Contoh: Setiap hari, 06.00 - 18.00 WIB"
          />
        </Field>

        <Field label="Catatan akses">
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={3}
            maxLength={1000}
            disabled={sedangMenyimpan}
            className={inputCls}
            placeholder="Biaya, antrean, atau aturan penggunaan"
          />
        </Field>

        <Field
          label="Sumber pembaruan"
          hint="Pilih dasar informasi perubahan ini."
        >
          <select
            value={sumber}
            onChange={(e) => setSumber(e.target.value)}
            required
            disabled={sedangMenyimpan}
            className={inputCls}
          >
            <option value="">Pilih sumber</option>
            {SUMBER_PEMBARUAN.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        {pesanError && (
          <p
            role="alert"
            className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {pesanError}
          </p>
        )}

        <p className="flex gap-2 rounded-2xl bg-aira-sand p-4 text-sm leading-relaxed">
          <Info className="mt-0.5 size-4 shrink-0 text-aira-primary" />
          Waktu pembaruan dan sumber informasi perlu dicatat agar perubahan
          dapat ditelusuri. Pastikan informasi ketersediaan sesuai dengan
          kondisi atau sumber yang dapat dipertanggungjawabkan.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={!bisaSimpan}
            className="min-h-[52px] w-full rounded-full bg-aira-primary px-8 py-3.5 font-semibold text-white shadow-soft transition-colors hover:bg-aira-primary-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-aira-primary sm:w-auto"
          >
            {sedangMenyimpan ? "Menyimpan..." : "Simpan Perubahan"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={sedangMenyimpan}
            className="min-h-[52px] w-full rounded-full px-6 py-3.5 font-semibold text-aira-primary hover:bg-aira-primary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Batal
          </button>
        </div>
      </form>
    </Overlay>
  );
}
