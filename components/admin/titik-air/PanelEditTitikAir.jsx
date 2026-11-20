"use client";

import { useState } from "react";
import { Clock, Info } from "lucide-react";

import Modal from "@/components/admin/titik-air/Modal";
import { Alert } from "@/components/admin/titik-air/PesanUi";
import {
  kolomForm,
  kolomSalah,
  tombolGhost,
  tombolUtama,
} from "@/components/admin/titik-air/titikAirStyles";
import { VerificationBadge } from "@/components/StatusBadge";
import { Field } from "@/components/dashboard/DashboardFormUi";
import { normalizeIndonesianPhone } from "@/lib/phone";

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

// Modal "Edit titik air" (Figma Make: EditModal). Namanya masih PanelEditTitikAir
// supaya import di file lain tidak berubah, tetapi tampilannya sekarang modal
// terpusat, bukan panel samping kanan.
//
// Props:
//  - titik             : data titik air yang diedit
//  - menyimpan         : tampilan "Menyimpan..." (proses asli ATAU pratinjau)
//  - terkunci          : proses simpan ASLI sedang berjalan -> modal tak boleh ditutup
//  - galatPratinjau    : tampilkan kotak galat contoh (state "Edit galat")
//  - pratinjauTerkunci : state pratinjau yang tidak boleh mengirim form
//  - onClose, onSimpan : callback dari KelolaTitikAir
export default function PanelEditTitikAir({
  titik,
  menyimpan = false,
  terkunci = false,
  galatPratinjau = false,
  pratinjauTerkunci = false,
  onClose,
  onSimpan,
}) {
  const [nama, setNama] = useState(titik?.name || "");
  const [alamat, setAlamat] = useState(titik?.address || "");
  const [ketersediaan, setKetersediaan] = useState(
    titik?.availability || "Belum Diketahui"
  );
  const [jam, setJam] = useState(titik?.hours || "");
  const [pengelola, setPengelola] = useState(titik?.contact || "");
  const [telepon, setTelepon] = useState(titik?.phone || "");
  const [catatan, setCatatan] = useState(titik?.note || "");
  const [sumber, setSumber] = useState("");

  const [sudahCoba, setSudahCoba] = useState(false); // sudah menekan Simpan minimal sekali
  const [galatServer, setGalatServer] = useState("");

  // Nilai yang akan dikirim ke server (sudah dirapikan).
  const berikutnya = {
    name: nama.trim(),
    address: alamat.trim(),
    availability: ketersediaan,
    hours: jam.trim(),
    contact: pengelola.trim(),
    phone: telepon.trim(),
    note: catatan.trim(),
  };

  // Apakah ada yang berubah dibanding data awal?
  const berubah =
    berikutnya.name !== (titik?.name || "") ||
    berikutnya.address !== (titik?.address || "") ||
    berikutnya.availability !== (titik?.availability || "Belum Diketahui") ||
    berikutnya.hours !== (titik?.hours || "") ||
    berikutnya.contact !== (titik?.contact || "") ||
    berikutnya.phone !== (titik?.phone || "") ||
    berikutnya.note !== (titik?.note || "");

  // Pesan validasi (string kosong = valid). Urutan sama dengan Figma Make.
  function cariMasalah() {
    if (!berubah) return "Belum ada perubahan untuk disimpan.";
    if (!berikutnya.name || !berikutnya.address || !sumber) {
      return "Lengkapi nama, alamat, dan sumber pembaruan.";
    }
    if (berikutnya.contact.length > 150) {
      return "Nama pengelola maksimal 150 karakter.";
    }
    if (berikutnya.phone && !normalizeIndonesianPhone(berikutnya.phone)) {
      return "Nomor telepon pengelola tidak valid. Gunakan nomor Indonesia yang aktif.";
    }
    return "";
  }

  // Hint merah hanya muncul SETELAH pengguna mencoba menyimpan.
  const hint = sudahCoba ? cariMasalah() : "";

  const kirim = async () => {
    if (pratinjauTerkunci) return; // state pratinjau "menyimpan"/"galat": tidak kirim apa pun

    setSudahCoba(true);
    setGalatServer("");
    if (cariMasalah()) return;

    try {
      const hasil = await onSimpan(titik.id, berikutnya, sumber);
      if (!hasil?.success) {
        setGalatServer(
          hasil?.message ||
            "Perubahan belum dapat disimpan. Periksa koneksi Anda, lalu coba lagi."
        );
      }
    } catch (error) {
      console.error("Kesalahan saat menyimpan titik air:", error);
      setGalatServer(
        error?.message ||
          "Perubahan belum dapat disimpan. Periksa koneksi Anda, lalu coba lagi."
      );
    }
  };

  // Koordinat: tampil hanya jika keduanya angka yang valid.
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

  const tampilGalat = galatPratinjau || galatServer;

  return (
    <Modal
      title="Edit titik air"
      onClose={onClose}
      locked={terkunci}
      onSubmit={kirim}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={menyimpan}
            className={tombolGhost}
          >
            Batal
          </button>
          <button type="submit" disabled={menyimpan} className={tombolUtama}>
            {menyimpan ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </>
      }
    >
      {/* Identitas titik air */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-heading text-xl font-bold leading-snug text-aira-primary wrap-break-word">
              {titik?.name || "Titik air"}
            </h3>
            <p className="text-sm text-aira-text/65">
              {titik?.type || "Jenis belum diketahui"}
              {titik?.area ? `, ${titik.area}` : ""}
            </p>
          </div>
          <VerificationBadge v="Terverifikasi" />
        </div>

        <p className="mt-3 flex items-center gap-2 text-base text-aira-text/70">
          <Clock className="size-4" /> Terakhir diperbarui {waktuDiperbarui}
        </p>
      </div>

      {/* Ringkasan data yang tidak bisa diubah di sini */}
      <dl className="space-y-3 rounded-[16px] bg-aira-bg p-4 text-base">
        <div>
          <dt className="font-semibold">Alamat lengkap</dt>
          <dd className="text-aira-text/80">
            {titik?.address || "Informasi alamat belum tersedia"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Pengelola / kontak</dt>
          <dd className="text-aira-text/80">
            {[titik?.provider, titik?.contact].filter(Boolean).join(", ") ||
              "Belum tersedia"}
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

      {/* Form: 2 kolom di layar >= sm */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama titik air">
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            maxLength={200}
            disabled={menyimpan}
            className={kolomForm}
          />
        </Field>

        <Field label="Alamat / lokasi">
          <input
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            maxLength={500}
            disabled={menyimpan}
            className={kolomForm}
          />
        </Field>

        <Field label="Ketersediaan air">
          <select
            value={ketersediaan}
            onChange={(e) => setKetersediaan(e.target.value)}
            disabled={menyimpan}
            className={kolomForm}
          >
            {KETERSEDIAAN.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Jam operasional">
          <input
            value={jam}
            onChange={(e) => setJam(e.target.value)}
            maxLength={150}
            disabled={menyimpan}
            className={kolomForm}
            placeholder="Contoh: Setiap hari, 06.00 - 18.00 WIB"
          />
        </Field>

        <Field label="Nama pengelola">
          <input
            value={pengelola}
            onChange={(e) => setPengelola(e.target.value)}
            maxLength={150}
            disabled={menyimpan}
            className={kolomForm}
          />
        </Field>

        <Field label="Nomor telepon pengelola">
          <input
            type="tel"
            value={telepon}
            onChange={(e) => setTelepon(e.target.value)}
            maxLength={24}
            disabled={menyimpan}
            className={kolomForm}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Catatan akses">
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              maxLength={1000}
              disabled={menyimpan}
              className={kolomForm}
              placeholder="Biaya, antrean, atau aturan penggunaan"
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="Sumber pembaruan"
            hint="Pilih dasar informasi perubahan ini."
          >
            <select
              value={sumber}
              onChange={(e) => setSumber(e.target.value)}
              disabled={menyimpan}
              className={`${kolomForm} ${
                sudahCoba && !sumber ? kolomSalah : ""
              }`}
            >
              <option value="">Pilih sumber</option>
              {SUMBER_PEMBARUAN.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <p className="flex gap-3 rounded-[16px] bg-aira-sand p-4 text-base leading-relaxed">
        <Info className="mt-0.5 size-5 shrink-0 text-aira-primary" />
        Waktu pembaruan dan sumber informasi perlu dicatat agar perubahan dapat
        ditelusuri. Pastikan informasi ketersediaan sesuai dengan kondisi atau
        sumber yang dapat dipertanggungjawabkan.
      </p>

      {hint && (
        <p role="alert" className="text-base font-medium text-[#c0392b]">
          {hint}
        </p>
      )}

      {tampilGalat && (
        <Alert>
          {galatServer ||
            "Perubahan belum dapat disimpan. Periksa koneksi Anda, lalu coba lagi."}
        </Alert>
      )}
    </Modal>
  );
}
