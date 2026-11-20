"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import DeleteDialog from "@/components/admin/titik-air/DeleteDialog";
import FormTambahTitikAir from "@/components/admin/titik-air/FormTambahTitikAir";
import PanelEditTitikAir, {
  KETERSEDIAAN,
} from "@/components/admin/titik-air/PanelEditTitikAir";
import { Toast } from "@/components/admin/titik-air/PesanUi";

import {
  kartuUtama,
  kolomForm,
  tdTabel,
  thTabel,
  tombolEdit,
  tombolHapus,
  tombolUtama,
} from "@/components/admin/titik-air/titikAirStyles";

import {
  formatAvailability,
  formatCategory,
} from "@/components/admin/verifikasi-titik-air/formatters";

import { AvailabilityBadge } from "@/components/StatusBadge";

import {
  hapusTitikAirAction,
  simpanTitikAirAction as simpanBawaan,
} from "@/app/actions/admin-titik-air";

// Baris "Pratinjau:" (tombol-tombol state) ikut tampil di desain Figma Make.
// Itu alat bantu desain. Ubah menjadi false untuk menyembunyikannya saat rilis.
const TAMPILKAN_PRATINJAU = true;

const PRATINJAU = [
  { id: "edit", label: "Edit" },
  { id: "edit-saving", label: "Edit menyimpan" },
  { id: "edit-error", label: "Edit galat" },
  { id: "add", label: "Tambah" },
  { id: "add-invalid", label: "Tambah validasi" },
  { id: "add-ok", label: "Tambah berhasil" },
  { id: "delete", label: "Hapus" },
  { id: "delete-loading", label: "Hapus memuat" },
];

const tunggu = (ms) => new Promise((selesai) => setTimeout(selesai, ms));

export default function KelolaTitikAir({
  awal = [],
  simpanTitikAirAction, // opsional: kalau tidak diberikan, memakai action bawaan
}) {
  const [titik, setTitik] = useState(Array.isArray(awal) ? awal : []);

  const [kataKunci, setKataKunci] = useState("");
  const [filter, setFilter] = useState("Semua");

  // Modal mana yang sedang terbuka
  const [editId, setEditId] = useState(null);
  const [tambahTerbuka, setTambahTerbuka] = useState(false);
  const [hapusId, setHapusId] = useState(null);

  // Status proses ASLI (bukan pratinjau)
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [sedangMenghapus, setSedangMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");

  const [pesan, setPesan] = useState(""); // pesan sukses (Toast)
  const [pratinjau, setPratinjau] = useState(""); // state pratinjau aktif, "" = mode normal
  const [kunciForm, setKunciForm] = useState(0); // dinaikkan agar modal dibuat ulang dari awal

  // Tampilan "sedang memproses" = proses asli ATAU state pratinjau.
  const menyimpanTampil = sedangMenyimpan || pratinjau === "edit-saving";
  const menghapusTampil = sedangMenghapus || pratinjau === "delete-loading";

  const itemEdit = titik.find((t) => t.id === editId) ?? null;
  const itemHapus = titik.find((t) => t.id === hapusId) ?? null;

  // Daftar yang tampil setelah pencarian + filter ketersediaan.
  const daftar = useMemo(() => {
    const kunci = kataKunci.trim().toLowerCase();

    return titik.filter((t) => {
      const cocokFilter =
        filter === "Semua" || formatAvailability(t.availability) === filter;

      const teksCari = [t.name, t.area, t.type, t.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return cocokFilter && teksCari.includes(kunci);
    });
  }, [titik, filter, kataKunci]);

  // ---------- Membuka / menutup modal ----------

  const tutupSemua = () => {
    setEditId(null);
    setTambahTerbuka(false);
    setHapusId(null);
    setSedangMenyimpan(false);
    setSedangMenghapus(false);
    setGalatHapus("");
  };

  const bukaEdit = (id) => {
    setPesan("");
    setPratinjau("");
    setKunciForm((k) => k + 1);
    setEditId(id);
  };

  const bukaTambah = () => {
    tutupSemua();
    setPesan("");
    setPratinjau("");
    setKunciForm((k) => k + 1);
    setTambahTerbuka(true);
  };

  const bukaHapus = (id) => {
    setPesan("");
    setPratinjau("");
    setGalatHapus("");
    setHapusId(id);
  };

  const tutupEdit = () => {
    if (sedangMenyimpan) return;
    setEditId(null);
    setPratinjau("");
  };

  const tutupTambah = () => {
    setTambahTerbuka(false);
    setPratinjau("");
  };

  const tutupHapus = () => {
    if (sedangMenghapus) return;
    setHapusId(null);
    setGalatHapus("");
    setPratinjau("");
  };

  // Tombol "Pratinjau": membuka modal sesuai state yang dipilih memakai titik air pertama.
  const bukaPratinjau = (id) => {
    tutupSemua();
    setPesan("");
    setPratinjau(id);
    setKunciForm((k) => k + 1);

    const pertama = titik[0]?.id ?? null;
    if (id.startsWith("edit")) setEditId(pertama);
    if (id.startsWith("add")) setTambahTerbuka(true);
    if (id.startsWith("delete")) setHapusId(pertama);
  };

  // ---------- Menyimpan perubahan (modal Edit) ----------

  // Mengembalikan { success, message } agar modal bisa menampilkan galat sendiri.
  const simpan = async (id, perubahan, sumber) => {
    setPesan("");
    const item = titik.find((t) => t.id === id);
    const namaTampil = perubahan.name || item?.name || "";

    // Mode pratinjau: HANYA simulasi. Tidak ada data asli yang diubah.
    if (pratinjau) {
      setSedangMenyimpan(true);
      await tunggu(700);
      setSedangMenyimpan(false);
      setEditId(null);
      setPratinjau("");
      setPesan(
        `Pratinjau: perubahan "${namaTampil}" disimulasikan dan tidak disimpan.`
      );
      return { success: true };
    }

    const jalankan = simpanTitikAirAction ?? simpanBawaan;
    setSedangMenyimpan(true);

    try {
      const hasil = await jalankan({ pointId: id, perubahan, sumber });

      if (!hasil?.success) {
        return {
          success: false,
          message: hasil?.message || "Perubahan titik air gagal disimpan.",
        };
      }

      setTitik((lama) =>
        lama.map((t) =>
          t.id === id
            ? {
                ...t,
                ...perubahan,
                updated: "Diperbarui baru saja",
                updatedHoursAgo: 0,
              }
            : t
        )
      );
      setEditId(null);
      setPesan(`Perubahan "${namaTampil}" tersimpan dan tampil di Navigasi Air.`);
      return { success: true };
    } catch (error) {
      console.error("Gagal menyimpan perubahan titik air:", error);
      return {
        success: false,
        message:
          error?.message ||
          "Perubahan belum dapat disimpan. Periksa koneksi Anda, lalu coba lagi.",
      };
    } finally {
      setSedangMenyimpan(false);
    }
  };

  // ---------- Menghapus (menonaktifkan) titik air ----------

  const konfirmasiHapus = async () => {
    if (!itemHapus || sedangMenghapus) return;

    const { id, name } = itemHapus;
    setGalatHapus("");
    setSedangMenghapus(true);

    // Mode pratinjau: simulasi saja, titik air asli TIDAK dinonaktifkan.
    if (pratinjau) {
      await tunggu(800);
      setSedangMenghapus(false);
      setHapusId(null);
      setPratinjau("");
      setPesan(`Pratinjau: penghapusan "${name}" disimulasikan dan tidak dijalankan.`);
      return;
    }

  const hapusTitikAir = async (item) => {
    const konfirmasi = window.confirm(`Hapus permanen titik air "${item.name || "Tanpa nama"}" dari database? Riwayat kontribusi/review akan tetap dipertahankan dan relasinya dilepas.`);
    if (!konfirmasi) return;
    setPesan(null);
    setSedangMenghapusId(item.id);
    try {
      const hasil = await hapusTitikAirAction(item.id);
      if (!hasil?.success) throw new Error(hasil?.message || "Titik air gagal dihapus.");
      setTitik((items) => items.filter((t) => t.id !== item.id));
      if (editId === item.id) setEditId(null);
      setPesan({ type: "success", text: hasil.message || "Titik air berhasil dihapus dari database." });
    } catch (error) {
      setPesan({ type: "error", text: error?.message || "Gagal menghapus titik air. Daftar tidak diubah." });
    } finally {
      setSedangMenghapus(false);
    }
  };

  const sedangHapusBaris = (id) => menghapusTampil && hapusId === id;

  // Tombol Edit & Hapus dipakai di tabel (desktop) dan kartu (HP/tablet).
  const tombolHapusIsi = (t) =>
    sedangHapusBaris(t.id) ? (
      "Menghapus..."
    ) : (
      <>
        <Trash2 className="size-4" /> Hapus
      </>
    );

  return (
    <div className="space-y-6">
      {/* Judul halaman + tombol Tambah */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <AdminPageHeader
          large
          title="Kelola Titik Air"
          description="Direktori titik air terverifikasi yang tampil di Navigasi Air. Perbarui ketersediaan dan informasi operasional berdasarkan sumber informasi yang jelas."
        />

        <button
          type="button"
          onClick={bukaTambah}
          className={`${tombolUtama} inline-flex w-full items-center justify-center gap-2 sm:w-auto`}
        >
          <Plus className="size-5" /> Tambah Titik Air
        </button>
      </div>

      {/* Pratinjau state (alat bantu desain dari Figma Make) */}
      {TAMPILKAN_PRATINJAU && (
        <div
          className="flex flex-wrap items-center gap-2 text-sm"
          role="group"
          aria-label="Pratinjau state"
        >
          <span className="font-semibold text-aira-text/65">Pratinjau:</span>
          {PRATINJAU.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => bukaPratinjau(p.id)}
              className="min-h-[36px] rounded-full border border-aira-primary/20 bg-white px-3 py-1.5 font-semibold text-aira-primary hover:bg-aira-primary/10"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <Toast text={pesan} />

      {/* Kartu: pencarian + filter + tabel */}
      <section className={kartuUtama}>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <span className="sr-only">Cari titik air</span>
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-aira-primary" />
            <input
              value={kataKunci}
              onChange={(e) => setKataKunci(e.target.value)}
              placeholder="Cari nama, jenis, atau wilayah"
              className={`${kolomForm} pl-12`}
            />
          </label>

          <select
            aria-label="Filter ketersediaan"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={kolomForm}
          >
            <option value="Semua">Semua</option>
            {KETERSEDIAAN.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {/* Tabel desktop (layar >= 1280px) */}
        <table className="mt-4 hidden w-full table-fixed text-left text-base xl:table">
          <thead>
            <tr className="border-b border-aira-primary/10">
              <th className={`${thTabel} w-[24%]`}>Titik air</th>
              <th className={`${thTabel} w-[15%]`}>Wilayah</th>
              <th className={`${thTabel} w-[170px]`}>Ketersediaan</th>
              <th className={`${thTabel} w-[26%] whitespace-nowrap`}>
                Jam operasional
              </th>
              <th className={`${thTabel} w-[136px] text-right`}>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {daftar.map((t) => (
              <tr
                key={t.id}
                className="border-b border-aira-primary/5 last:border-0 hover:bg-aira-bg"
              >
                <td className={`${tdTabel} min-h-[88px]`}>
                  <p className="font-semibold text-aira-primary wrap-break-word">
                    {t.name || "Tanpa nama"}
                  </p>
                  <p className="text-sm text-aira-text/65">
                    {formatCategory(t.type)}
                  </p>
                </td>

                <td className={`${tdTabel} wrap-break-word`}>
                  {t.area || "Wilayah belum tersedia"}
                </td>

                <td className={`${tdTabel} whitespace-nowrap`}>
                  <AvailabilityBadge v={formatAvailability(t.availability)} />
                </td>

                <td className={tdTabel}>
                  <p className="text-aira-text/80 wrap-break-word">
                    {t.hours || "Belum diketahui"}
                  </p>
                  <p className="text-sm text-aira-text/65">
                    {t.updated || "Belum ada informasi pembaruan"}
                  </p>
                </td>

                <td className={td}>
                  <div className="flex justify-end gap-2">
                    <TombolEdit onClick={() => setEditId(t.id)} />
                    <button type="button" disabled={sedangMenghapusId === t.id} onClick={() => hapusTitikAir(t)} aria-label={`Hapus ${t.name}`} title="Hapus titik air secara permanen" className="inline-flex min-w-10 items-center justify-center gap-2 rounded-full border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-4" />{sedangMenghapusId === t.id ? "..." : "Hapus"}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Kartu HP / tablet (layar < 1280px) */}
        <ul className="mt-4 space-y-3 xl:hidden">
          {daftar.map((t) => (
            <li
              key={t.id}
              className="rounded-[16px] border border-aira-primary/10 p-5"
            >
              <p className="font-semibold text-aira-primary wrap-break-word">
                {t.name || "Tanpa nama"}
              </p>
              <p className="text-sm text-aira-text/65">
                {formatCategory(t.type)}
              </p>
              <p className="mt-2 text-base text-aira-text/75">
                {t.area || "Wilayah belum tersedia"}
              </p>

              <div className="mt-3 whitespace-nowrap">
                <AvailabilityBadge v={formatAvailability(t.availability)} />
              </div>

              <p className="mt-3 text-base text-aira-text/80">
                {t.hours || "Belum diketahui"}
              </p>
              <p className="text-sm text-aira-text/65">
                {t.updated || "Belum ada informasi pembaruan"}
              </p>

              <TombolEdit onClick={() => setEditId(t.id)} penuh />
              <button type="button" disabled={sedangMenghapusId === t.id} onClick={() => hapusTitikAir(t)} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-4" />{sedangMenghapusId === t.id ? "Menghapus..." : "Hapus titik air"}</button>
            </li>
          ))}
        </ul>

        {daftar.length === 0 && (
          <p className="mt-4 rounded-[16px] bg-aira-bg p-8 text-center text-base text-aira-text/70">
            Tidak ada titik air yang cocok dengan pencarian.
          </p>
        )}

        <p className="mt-4 text-sm text-aira-text/65">
          {daftar.length} dari {titik.length} titik air aktif
        </p>
      </section>

      {/* Modal Edit */}
      {itemEdit && (
        <PanelEditTitikAir
          key={`${itemEdit.id}-${kunciForm}`}
          titik={itemEdit}
          menyimpan={menyimpanTampil}
          terkunci={sedangMenyimpan}
          galatPratinjau={pratinjau === "edit-error"}
          pratinjauTerkunci={
            pratinjau === "edit-saving" || pratinjau === "edit-error"
          }
          onClose={tutupEdit}
          onSimpan={simpan}
        />
      )}

      {/* Modal Tambah */}
      {tambahTerbuka && (
        <FormTambahTitikAir
          key={`tambah-${kunciForm}`}
          awal={
            pratinjau === "add-invalid"
              ? "invalid"
              : pratinjau === "add-ok"
                ? "ok"
                : ""
          }
          onClose={tutupTambah}
        />
      )}

      {/* Dialog Hapus */}
      {itemHapus && (
        <DeleteDialog
          nama={itemHapus.name || "Tanpa nama"}
          memuat={menghapusTampil}
          terkunci={sedangMenghapus}
          galat={galatHapus}
          onBatal={tutupHapus}
          onKonfirmasi={konfirmasiHapus}
        />
      )}
    </div>
  );
}
