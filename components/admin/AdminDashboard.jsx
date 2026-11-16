"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Droplets,
  ClipboardList,
  Activity,
  ArrowRight,
  ShieldCheck,
  Clock3,
  Pencil,
  Plus,
  XCircle,
  History,
} from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";

import {
  MOCK_ADMIN,
  MOCK_ADMIN_STATS,
  MOCK_CONTRIBUTION_STATUS,
  MOCK_AUDIT_LOGS,
} from "@/data/admin/mockAdmin";

/* =========================================
   ICON DAN WARNA KARTU STATISTIK
========================================= */

const statIcons = {
  droplet: Droplets,
  "clipboard-list": ClipboardList,
  activity: Activity,
};

const statColors = {
  teal: "bg-[#E0F1F0] text-aira-primary",
  peach: "bg-[#F8E5DF] text-[#B4563C]",
  sage: "bg-[#DDF0E8] text-[#327D69]",
};

/* =========================================
   KARTU STATISTIK
========================================= */

function AdminStatCard({ stat }) {
  const Icon = statIcons[stat.icon] || Activity;

  return (
    <Link
      href={stat.href}
      className="group flex min-h-[136px] flex-col justify-between rounded-[20px] border border-aira-primary/5 bg-white p-5 shadow-[0_8px_28px_-10px_rgba(23,107,120,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-aira-text/80">
          {stat.title}
        </p>

        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${statColors[stat.color]}`}
        >
          <Icon className="size-5" />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-3xl font-bold tracking-tight text-aira-primary">
          {stat.value}
        </p>

        <p className="mt-1 text-xs leading-relaxed text-aira-text/60">
          {stat.description}
          <ArrowRight className="ml-1 inline size-3.5" />
        </p>
      </div>
    </Link>
  );
}

/* =========================================
   STATUS SELURUH KONTRIBUSI
========================================= */

function ContributionStatus() {
  const total = MOCK_CONTRIBUTION_STATUS.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <section className="rounded-[22px] bg-white px-5 py-5 shadow-[0_8px_28px_-10px_rgba(23,107,120,0.18)] sm:px-6">
      <h2 className="mb-4 text-base font-semibold text-aira-primary sm:text-lg">
        Status seluruh kontribusi
      </h2>

      <div
        className="flex h-3.5 w-full overflow-hidden rounded-full bg-gray-100"
        role="img"
        aria-label={`Total ${total} kontribusi`}
      >
        {MOCK_CONTRIBUTION_STATUS.map((item) => (
          <div
            key={item.id}
            style={{
              width: total > 0 ? `${(item.value / total) * 100}%` : "0%",
              backgroundColor: item.color,
            }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {MOCK_CONTRIBUTION_STATUS.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 text-sm text-aira-text/75"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
            <span className="font-semibold text-aira-text">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================
   LABEL AKSI AUDIT
========================================= */

const actionStyles = {
  contribution: {
    label: "Kontribusi baru",
    className: "bg-[#F4EBDD] text-[#66543B]",
    icon: Plus,
  },
  verification: {
    label: "Verifikasi",
    className: "bg-[#DDF0E8] text-[#28735E]",
    icon: ShieldCheck,
  },
  edit: {
    label: "Edit titik air",
    className: "bg-[#E0EDF7] text-[#28658A]",
    icon: Pencil,
  },
  revision: {
    label: "Perlu perbaikan",
    className: "bg-[#FDF1D8] text-[#8A6414]",
    icon: Clock3,
  },
  rejected: {
    label: "Ditolak",
    className: "bg-[#F8E0D9] text-[#A3432D]",
    icon: XCircle,
  },
};

/* =========================================
   FILTER AUDIT
========================================= */

const filterOptions = [
  { label: "Semua", value: "all" },
  { label: "Verifikasi", value: "verification" },
  { label: "Edit titik air", value: "edit" },
  { label: "Kontribusi baru", value: "contribution" },
];

/* =========================================
   TABEL JEJAK AUDIT
========================================= */

function AuditLogTable() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    if (activeFilter === "all") return MOCK_AUDIT_LOGS;
    return MOCK_AUDIT_LOGS.filter((item) => item.actionType === activeFilter);
  }, [activeFilter]);

  return (
    <section className="w-full overflow-hidden rounded-[22px] border border-aira-primary/5 bg-white shadow-[0_8px_28px_-10px_rgba(23,107,120,0.16)]">
      {/* HEADER DAN FILTER */}
      <div className="flex flex-col gap-4 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <History className="size-5 shrink-0 text-aira-primary" />
          <h2 className="text-base font-semibold tracking-tight text-aira-primary sm:text-lg">
            Jejak audit sistem
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              aria-pressed={activeFilter === filter.value}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                activeFilter === filter.value
                  ? "border-aira-primary bg-aira-primary text-white"
                  : "border-aira-primary/20 bg-white text-aira-primary hover:bg-aira-sage/20"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABEL AUDIT */}
      <div className="overflow-x-auto px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[13%]" />
            <col className="w-[19%]" />
            <col className="w-[28%]" />
            <col className="w-[23%]" />
          </colgroup>

          <thead>
            <tr className="border-b border-aira-primary/10 text-xs font-semibold uppercase tracking-wide text-aira-text/55">
              <th className="px-2 pb-3 pt-1">Waktu</th>
              <th className="px-2 pb-3 pt-1">Pelaku</th>
              <th className="px-2 pb-3 pt-1">Aksi</th>
              <th className="px-2 pb-3 pt-1">Objek</th>
              <th className="px-2 pb-3 pt-1">Keterangan</th>
            </tr>
          </thead>

          <tbody>
            {filteredLogs.map((log) => {
              const action = actionStyles[log.actionType];
              if (!action) return null;
              const ActionIcon = action.icon;

              return (
                <tr
                  key={log.id}
                  className="border-b border-aira-primary/[0.07] transition-colors last:border-0 hover:bg-aira-bg/60"
                >
                  <td className="px-2 py-4 align-middle text-sm leading-relaxed text-aira-text/70">
                    {log.date}, {log.time}
                  </td>

                  <td className="px-2 py-4 align-middle text-sm font-medium leading-relaxed text-aira-text">
                    {log.actor}
                  </td>

                  <td className="px-2 py-4 align-middle">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${action.className}`}
                    >
                      <ActionIcon className="size-4 shrink-0" />
                      {action.label}
                    </span>
                  </td>

                  <td className="break-words px-2 py-4 align-middle text-sm font-medium leading-relaxed text-aira-primary">
                    {log.object}
                  </td>

                  <td className="break-words px-2 py-4 align-middle text-sm leading-relaxed text-aira-text/65">
                    {log.description}
                  </td>
                </tr>
              );
            })}

            {filteredLogs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-aira-text/55"
                >
                  Tidak ada aktivitas untuk kategori ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER TABEL */}
      <div className="border-t border-aira-primary/[0.06] px-5 py-3.5 sm:px-6">
        <p className="text-xs text-aira-text/55 sm:text-sm">
          Menampilkan {filteredLogs.length} dari {MOCK_AUDIT_LOGS.length} aktivitas
        </p>
      </div>
    </section>
  );
}

/* =========================================
   HALAMAN DASHBOARD ADMIN
========================================= */

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-aira-bg">
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-start gap-6 px-4 py-6 sm:px-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* SIDEBAR */}
        <AdminSidebar admin={MOCK_ADMIN} />

        {/* KONTEN UTAMA */}
        <div className="min-w-0 space-y-5">
          <header className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-aira-primary/65">
              <span>Panel Admin</span>
              <span>/</span>
              <span>Ringkasan & Riwayat</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-aira-primary sm:text-3xl">
              Ringkasan & Riwayat
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-aira-text/65">
              Pantau aktivitas pengelolaan data titik air, kontribusi warga,
              dan status verifikasi dalam satu halaman.
            </p>
          </header>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {MOCK_ADMIN_STATS.map((stat) => (
              <AdminStatCard key={stat.id} stat={stat} />
            ))}
          </section>

          <ContributionStatus />
          <AuditLogTable />
        </div>
      </div>
    </main>
  );
} 