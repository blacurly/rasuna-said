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

export default function KelolaTitikAir({
  awal = [],
  simpanTitikAirAction,
}) {
  const [titik, setTitik] = useState(
    Array.isArray(awal) ? awal : []
  );

  const [kataKunci, setKataKunci] = useState("");
  const [filter, setFilter] = useState("Semua");

  // Modal yang sedang terbuka
  const [editId, setEditId] = useState(null);
  const [tambahTerbuka, setTambahTerbuka] = useState(false);
  const [hapusId, setHapusId] = useState(null);

  // Status proses
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [sedangMenghapus, setSedangMenghapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState("");

  const [pesan, setPesan] = useState("");

  const itemEdit =
    titik.find((t) => t.id === editId) ?? null;

  const itemHapus =
    titik.find((t) => t.id === hapusId) ?? null;

  // Daftar setelah pencarian dan filter
  const daftar = useMemo(() => {
    const kunci = kataKunci.trim().toLowerCase();

    return titik.filter((t) => {
      const cocokFilter =
        filter === "Semua" ||
        formatAvailability(t.availability) === filter;

      const teksCari = [
        t.name,
        t.area,
        t.type,
        t.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return cocokFilter && teksCari.includes(kunci);
    });
  }, [titik, filter, kataKunci]);

  // ---------- Membuka dan menutup modal ----------

  const tutupSemua = () => {
    if (sedangMenyimpan || sedangMenghapus) return;

    setEditId(null);
    setTambahTerbuka(false);
    setHapusId(null);
    setGalatHapus("");
  };

  const bukaEdit = (id) => {
    setPesan("");
    setEditId(id);
  };

  const bukaTambah = () => {
    tutupSemua();
    setPesan("");
    setTambahTerbuka(true);
  };

  const bukaHapus = (id) => {
    setPesan("");
    setGalatHapus("");
    setHapusId(id);
  };

  const tutupEdit = () => {
    if (sedangMenyimpan) return;
    setEditId(null);
  };

  const tutupTambah = () => {
    setTambahTerbuka(false);
  };

  const tutupHapus = () => {
    if (sedangMenghapus) return;

    setHapusId(null);
    setGalatHapus("");
  };

  // ---------- Menyimpan perubahan titik air ----------

  const simpan = async (id, perubahan, sumber) => {
    setPesan("");

    const item = titik.find((t) => t.id === id);
    const namaTampil = perubahan.name || item?.name || "";

    const jalankan = simpanTitikAirAction ?? simpanBawaan;

    setSedangMenyimpan(true);

    try {
      const hasil = await jalankan({
        pointId: id,
        perubahan,
        sumber,
      });

      if (!hasil?.success) {
        return {
          success: false,
          message:
            hasil?.message ||
            "Perubahan titik air gagal disimpan.",
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

      setPesan(
        `Perubahan "${namaTampil}" tersimpan dan tampil di Navigasi Air.`
      );

      return { success: true };
    } catch (error) {
      console.error(
        "Gagal menyimpan perubahan titik air:",
        error
      );

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

  // ---------- Menghapus titik air secara permanen ----------

  const konfirmasiHapus = async () => {
    if (!itemHapus || sedangMenghapus) return;

    const { id, name } = itemHapus;

    setGalatHapus("");
    setSedangMenghapus(true);

    try {
      const hasil = await hapusTitikAirAction(id);

      if (!hasil?.success) {
        throw new Error(
          hasil?.message || "Titik air gagal dihapus."
        );
      }

      // Perbarui daftar hanya setelah backend berhasil
      setTitik((items) =>
        items.filter((t) => t.id !== id)
      );

      if (editId === id) {
        setEditId(null);
      }

      setHapusId(null);

      setPesan(
        hasil.message ||
          `Titik air "${name}" berhasil dihapus dari database.`
      );
    } catch (error) {
      console.error("Gagal menghapus titik air:", error);

      setGalatHapus(
        error?.message ||
          "Gagal menghapus titik air. Daftar tidak diubah."
      );
    } finally {
      setSedangMenghapus(false);
    }
  };

  const sedangHapusBaris = (id) =>
    sedangMenghapus && hapusId === id;

  // Konten tombol hapus
  const tombolHapusIsi = (t) =>
    sedangHapusBaris(t.id) ? (
      "Menghapus..."
    ) : (
      <>
        <Trash2 className="size-4" />
        Hapus
      </>
    );

  // ---------- Tampilan halaman ----------

  return (
    <div className="space-y-6">
      {/* Judul halaman dan tombol tambah */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <AdminPageHeader
          large
          title="Kelola Titik Air"
          description="Direktori titik air terverifikasi yang tampil di Navigasi Air. Perbarui ketersediaan dan informasi operasional berdasarkan sumber informasi yang jelas."
        />

        <button
          type="button"
          onClick={bukaTambah}
          disabled={sedangMenyimpan || sedangMenghapus}
          className={`${tombolUtama} inline-flex w-full items-center justify-center gap-2 sm:w-auto`}
        >
          <Plus className="size-5" />
          Tambah Titik Air
        </button>
      </div>

      <Toast text={pesan} />

      {/* Pencarian, filter, dan daftar titik air */}
      <section className={kartuUtama}>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <span className="sr-only">
              Cari titik air
            </span>

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

        {/* Tabel desktop */}
        <table className="mt-4 hidden w-full table-fixed text-left text-base xl:table">
          <thead>
            <tr className="border-b border-aira-primary/10">
              <th className={`${thTabel} w-[24%]`}>
                Titik air
              </th>

              <th className={`${thTabel} w-[15%]`}>
                Wilayah
              </th>

              <th className={`${thTabel} w-[170px]`}>
                Ketersediaan
              </th>

              <th
                className={`${thTabel} w-[26%] whitespace-nowrap`}
              >
                Jam operasional
              </th>

              <th
                className={`${thTabel} w-[136px] text-right`}
              >
                Aksi
              </th>
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
                  <AvailabilityBadge
                    v={formatAvailability(t.availability)}
                  />
                </td>

                <td className={tdTabel}>
                  <p className="text-aira-text/80 wrap-break-word">
                    {t.hours || "Belum diketahui"}
                  </p>

                  <p className="text-sm text-aira-text/65">
                    {t.updated || "Belum ada informasi pembaruan"}
                  </p>
                </td>

                <td className={tdTabel}>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => bukaEdit(t.id)}
                      disabled={sedangMenyimpan || sedangMenghapus}
                      aria-label={`Edit ${t.name}`}
                      className={tombolEdit}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => bukaHapus(t.id)}
                      disabled={sedangMenyimpan || sedangHapusBaris(t.id)}
                      aria-label={`Hapus ${t.name}`}
                      className={tombolHapus}
                    >
                      {tombolHapusIsi(t)}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Kartu HP dan tablet */}
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
                <AvailabilityBadge
                  v={formatAvailability(t.availability)}
                />
              </div>

              <p className="mt-3 text-base text-aira-text/80">
                {t.hours || "Belum diketahui"}
              </p>

              <p className="text-sm text-aira-text/65">
                {t.updated || "Belum ada informasi pembaruan"}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => bukaEdit(t.id)}
                  disabled={sedangMenyimpan || sedangMenghapus}
                  aria-label={`Edit ${t.name}`}
                  className={`${tombolEdit} w-full! flex-1`}
                >
                  <Pencil className="size-4" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => bukaHapus(t.id)}
                  disabled={sedangMenyimpan || sedangHapusBaris(t.id)}
                  aria-label={`Hapus ${t.name}`}
                  className={`${tombolHapus} w-full! flex-1`}
                >
                  {tombolHapusIsi(t)}
                </button>
              </div>
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

      {/* Modal edit */}
      {itemEdit && (
        <PanelEditTitikAir
          key={itemEdit.id}
          titik={itemEdit}
          menyimpan={sedangMenyimpan}
          terkunci={sedangMenyimpan}
          onClose={tutupEdit}
          onSimpan={simpan}
        />
      )}

      {/* Modal tambah */}
      {tambahTerbuka && (
        <FormTambahTitikAir
          onClose={tutupTambah}
        />
      )}

      {/* Dialog konfirmasi hapus */}
      {itemHapus && (
        <DeleteDialog
          nama={itemHapus.name || "Tanpa nama"}
          memuat={sedangMenghapus}
          terkunci={sedangMenghapus}
          galat={galatHapus}
          onBatal={tutupHapus}
          onKonfirmasi={konfirmasiHapus}
        />
      )}
    </div>
  );
}
