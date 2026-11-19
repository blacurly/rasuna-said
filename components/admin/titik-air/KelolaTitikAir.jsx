"use client";

import { useCallback, useState } from "react";
import { Droplets, Pencil, Search } from "lucide-react";

import PanelEditTitikAir, { KETERSEDIAAN } from "@/components/admin/titik-air/PanelEditTitikAir";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { formatCategory } from "@/components/admin/verifikasi-titik-air/formatters";
import {
  adminCard,
  adminCardPad,
  adminTh,
  adminBtnOutline,
  adminInput,
} from "@/components/admin/adminStyles";

const td = "min-w-0 px-3 py-4 align-middle";

const AVAIL_STYLE = {
  Tersedia: "bg-[#C8E9DF] text-[#286B59]",
  Terbatas: "bg-[#FCE8B5] text-[#87651D]",
  "Tidak Tersedia": "bg-[#FCE3DC] text-[#A94D37]",
  "Belum Diketahui": "bg-[#E9ECEC] text-[#536267]",
};

function AvailabilityChip({ v }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none ${
        AVAIL_STYLE[v] || AVAIL_STYLE["Belum Diketahui"]
      }`}
    >
      <Droplets size={13} className="shrink-0" /> {v}
    </span>
  );
}

function TombolEdit({ onClick, penuh = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${adminBtnOutline} min-w-[88px] ${penuh ? "mt-4 w-full" : ""}`}
    >
      <Pencil className="size-4" /> Edit
    </button>
  );
}

// Kelola Titik Air (C03): direktori titik air terverifikasi, pencarian, filter ketersediaan, dan panel Edit.
export default function KelolaTitikAir({ awal }) {
  const [titik, setTitik] = useState(awal);
  const [kataKunci, setKataKunci] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [editId, setEditId] = useState(null);
  const [pesan, setPesan] = useState("");

  const dipilih = titik.find((t) => t.id === editId) ?? null;
  const tutupPanel = useCallback(() => setEditId(null), []);

  const daftar = titik.filter(
    (t) =>
      (filter === "Semua" || t.availability === filter) &&
      `${t.name} ${t.area} ${t.type}`.toLowerCase().includes(kataKunci.toLowerCase())
  );

  const simpan = (id, perubahan, sumber) => {
    // SIMULASI: perubahan hanya tersimpan di halaman ini.
    // TODO (Tria): panggil Server Action edit titik air (catat ke jejak audit dan perbarui updated_at),
    // sehingga perubahan tercermin di Navigasi Air. `sumber` ikut dicatat sebagai dasar perubahan.
    void sumber;
    const nama = titik.find((t) => t.id === id)?.name ?? "";
    setTitik((l) =>
      l.map((t) => (t.id === id ? { ...t, ...perubahan, updated: "Diperbarui baru saja", updatedHoursAgo: 0 } : t))
    );
    setPesan(`Perubahan "${nama}" tersimpan dan tampil di Navigasi Air.`);
    setEditId(null);
  };

  return (
    <>
      <AdminPageHeader
        title="Kelola Titik Air"
        description="Direktori titik air terverifikasi yang tampil di Navigasi Air. Perbarui ketersediaan dan jam operasional saat ada perubahan."
      />

      {pesan && (
        <p
          role="status"
          className="fade-up rounded-xl border border-aira-sage bg-aira-sage/50 px-4 py-3 text-sm font-medium text-aira-primary-dark"
        >
          {pesan}
        </p>
      )}

      <section className={`${adminCard} ${adminCardPad} w-full min-w-0`}>
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <label className="relative">
            <span className="sr-only">Cari titik air</span>
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-aira-primary" />
            <input
              value={kataKunci}
              onChange={(e) => setKataKunci(e.target.value)}
              placeholder="Cari nama, jenis, atau wilayah"
              className={`${adminInput} pl-11`}
            />
          </label>
          <select
            aria-label="Filter ketersediaan"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={adminInput}
          >
            <option>Semua</option>
            {KETERSEDIAAN.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>

        {/* Desktop: tabel. Mobile/tablet: kartu (breakpoint sama dengan C02). */}
        <table className="mt-4 hidden w-full table-fixed border-collapse text-left lg:table">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-aira-primary/10">
              <th className={adminTh}>Titik air</th>
              <th className={adminTh}>Wilayah</th>
              <th className={adminTh}>Ketersediaan</th>
              <th className={adminTh}>Jam operasional</th>
              <th className={adminTh}>
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((t) => (
              <tr
                key={t.id}
                className="border-b border-aira-primary/[0.08] transition-colors last:border-b-0 hover:bg-aira-bg/60"
              >
                <td className={td}>
                  <p className="break-words text-sm font-semibold leading-snug text-aira-primary">{t.name}</p>
                  <p className="mt-1 text-xs leading-snug text-aira-text/55">{formatCategory(t.type)}</p>
                </td>
                <td className={`${td} text-sm text-aira-text/80`}>{t.area}</td>
                <td className={`${td} whitespace-nowrap`}>
                  <AvailabilityChip v={t.availability} />
                </td>
                <td className={td}>
                  <p className="text-sm text-aira-text/80">{t.hours}</p>
                  <p className="mt-1 text-xs text-aira-text/55">{t.updated}</p>
                </td>
                <td className={td}>
                  <div className="flex justify-end">
                    <TombolEdit onClick={() => setEditId(t.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="mt-4 space-y-3 lg:hidden">
          {daftar.map((t) => (
            <li key={t.id} className="rounded-xl border border-aira-primary/10 bg-white p-4">
              <p className="break-words text-sm font-semibold text-aira-primary">{t.name}</p>
              <p className="mt-1 text-xs text-aira-text/55">{formatCategory(t.type)}</p>
              <p className="mt-2 text-xs text-aira-text/70">{t.area}</p>
              <div className="mt-3 whitespace-nowrap">
                <AvailabilityChip v={t.availability} />
              </div>
              <p className="mt-3 text-sm text-aira-text/80">{t.hours}</p>
              <p className="text-xs text-aira-text/55">{t.updated}</p>
              <TombolEdit onClick={() => setEditId(t.id)} penuh />
            </li>
          ))}
        </ul>

        {daftar.length === 0 && (
          <p className="mt-4 rounded-xl bg-aira-bg p-8 text-center text-sm text-aira-text/60">
            Tidak ada titik air yang cocok dengan pencarian.
          </p>
        )}
        <p className="mt-4 text-xs text-aira-text/55">
          {daftar.length} dari {titik.length} titik air aktif
        </p>
      </section>

      {dipilih && <PanelEditTitikAir key={dipilih.id} titik={dipilih} onClose={tutupPanel} onSimpan={simpan} />}
    </>
  );
} 