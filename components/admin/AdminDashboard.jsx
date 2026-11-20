"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  Droplets,
  ClipboardList,
  Activity,
  ArrowRight,
  ShieldCheck,
  History,
  Users,
  UserCheck,
  UserX,
  UserCog,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import UserManagement from "@/components/admin/pengguna/UserManagement";
import {
  adminCard,
  adminH2,
  adminTh,
  adminBtnPrimary,
  adminBtnOutline,
  adminBtnSm,
} from "@/components/admin/adminStyles";

import { MOCK_ADMIN } from "@/data/admin/mockAdmin";

// ============================================
// ICON DAN WARNA KARTU STATISTIK
// ============================================

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

// Tujuan tiap kartu (sesuai route yang ada).
const STAT_DESTINATIONS = {
  verified: "/admin/kelola-titik-air",
  pending: "/admin/verifikasi",
  activity: "#riwayat-aktivitas",
};

// ============================================
// KARTU STATISTIK DASHBOARD
// ============================================

function AdminStatCard({ stat }) {
  const Icon = statIcons[stat.icon] || Activity;
  const destination = STAT_DESTINATIONS[stat.id] ?? stat.href ?? "#";

  return (
    <Link
      href={destination}
      aria-label={`Lihat ${stat.title}`}
      className={`${adminCard} group flex min-h-32 flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aira-primary focus-visible:ring-offset-2`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-aira-text/75">
          {stat.title}
        </p>

        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${statColors[stat.color]}`}
        >
          <Icon className="size-4.5" />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-aira-primary sm:text-3xl">
          {stat.value}
        </p>

        <p className="mt-1 text-xs leading-relaxed text-aira-text/55">
          {stat.description}
          <ArrowRight className="ml-1 inline size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </p>
      </div>
    </Link>
  );
}

// ============================================
// KONFIGURASI STATISTIK PENGGUNA
// ============================================

const USER_STAT_CONFIG = [
  {
    id: "total_users",
    title: "Total Pengguna",
    description: "Seluruh akun terdaftar",
    icon: Users,
    color: "bg-[#E0EDF7] text-[#28658A]",
  },
  {
    id: "total_admins",
    title: "Total Admin",
    description: "Akun dengan hak akses admin",
    icon: UserCog,
    color: "bg-[#EDE5F8] text-[#76549B]",
  },
  {
    id: "total_regular_users",
    title: "Pengguna Biasa",
    description: "Akun pengguna AIRA",
    icon: Users,
    color: "bg-[#F4EBDD] text-[#8A704A]",
  },
  {
    id: "active_users",
    title: "Pengguna Aktif",
    description: "Akun dengan status active",
    icon: UserCheck,
    color: "bg-[#DDF0E8] text-[#327D69]",
  },
  {
    id: "inactive_users",
    title: "Pengguna Nonaktif",
    description: "Akun dengan status inactive",
    icon: UserX,
    color: "bg-[#F8E5DF] text-[#B4563C]",
  },
  {
    id: "suspended_users",
    title: "Pengguna Suspend",
    description: "Akun dengan status suspend",
    icon: ShieldCheck,
    color: "bg-[#FDF1D8] text-[#8A6414]",
  },
];

// ============================================
// KARTU STATISTIK PENGGUNA
// ============================================

function UserStatCard({ stat, value }) {
  const Icon = stat.icon;

  return (
    <div
      className={`${adminCard} flex min-h-32 flex-col justify-between p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-aira-text/75">
          {stat.title}
        </p>

        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
        >
          <Icon className="size-4.5" />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-aira-primary sm:text-3xl">
          {Number(value || 0).toLocaleString("id-ID")}
        </p>

        <p className="mt-1 text-xs text-aira-text/55">{stat.description}</p>
      </div>
    </div>
  );
}

// ============================================
// INTEGRASI API STATISTIK PENGGUNA
// ============================================

function AdminUserStatistics({ refreshKey, onManage }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUserStats = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/users/stats", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil statistik pengguna."
        );
      }

      setStats(result.data);
    } catch (err) {
      console.error("[AdminUserStatistics]", err);
      setError(err.message || "Terjadi kesalahan saat mengambil statistik.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats, refreshKey]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className={adminH2}>Statistik Pengguna</h2>

          <p className="text-sm text-aira-text/60">
            Ringkasan akun pengguna yang terdaftar di AIRA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={onManage} className={adminBtnPrimary}>
            <UserCog className="size-4" />
            Kelola Status Akun
          </button>

          <button
            type="button"
            onClick={fetchUserStats}
            disabled={loading}
            className={adminBtnOutline}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Perbarui Data
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={fetchUserStats}
            className="shrink-0 text-sm font-semibold text-red-700 underline"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading && !stats
          ? USER_STAT_CONFIG.map((stat) => (
              <div
                key={stat.id}
                className={`${adminCard} min-h-32 animate-pulse p-5`}
              >
                <div className="h-4 w-28 rounded bg-gray-100" />
                <div className="mt-6 h-8 w-16 rounded bg-gray-100" />
                <div className="mt-3 h-3 w-36 rounded bg-gray-100" />
              </div>
            ))
          : USER_STAT_CONFIG.map((stat) => (
              <UserStatCard
                key={stat.id}
                stat={stat}
                value={stats?.[stat.id] ?? 0}
              />
            ))}
      </div>
    </section>
  );
}

// ============================================
// STATUS SELURUH KONTRIBUSI
// ============================================

function ContributionStatus({ refreshKey }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchOverview = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/overview", { credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Ringkasan dashboard gagal dimuat.");
      setOverview(result.data);
    } catch (err) { setError(err.message || "Ringkasan dashboard gagal dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchOverview(); }, [fetchOverview, refreshKey]);
  const statuses = [
    { id: "approved", label: "Disetujui", color: "#176B78" },
    { id: "pending", label: "Menunggu", color: "#4EA8DE" },
    { id: "needs_revision", label: "Perlu Perbaikan", color: "#E5A01B" },
    { id: "rejected", label: "Ditolak", color: "#D4573A" },
  ];
  const values = statuses.map((status) => ({ ...status, value: overview?.contribution_status?.[status.id] || 0 }));
  const total = values.reduce((sum, item) => sum + item.value, 0);
  return <section className={`${adminCard} px-5 py-5 sm:px-6`}>
    <div className="flex items-start justify-between gap-3"><div><h2 className={`${adminH2} mb-1`}>Status seluruh kontribusi</h2><p className="text-sm text-aira-text/60">Ringkasan status yang dibaca langsung dari database.</p></div><button type="button" onClick={fetchOverview} disabled={loading} className={adminBtnOutline}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {loading && !overview ? <div className="mt-5 h-3 animate-pulse rounded bg-gray-100" /> : <>
      <div className="mt-5 flex h-3.5 w-full overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`Total ${total} kontribusi`}>
        {values.map((item) => <div key={item.id} title={`${item.label}: ${item.value}`} style={{ width: total ? `${item.value/total*100}%` : "0%", backgroundColor: item.color }} />)}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">{values.map((item) => <div key={item.id} className="flex items-center gap-2 text-sm text-aira-text/75"><span className="size-2.5 rounded-full" style={{backgroundColor:item.color}}/><span>{item.label}</span><span className="font-semibold text-aira-text">{item.value}</span></div>)}</div>
      <p className="mt-3 text-xs text-aira-text/55">Total kontribusi: {total.toLocaleString("id-ID")}</p>
    </>}
  </section>;
}

function AdminOverviewCards({ refreshKey }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch("/api/admin/overview", { credentials: "same-origin", cache: "no-store" }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || "Ringkasan gagal dimuat."); setData(result.data); } catch (e) { setError(e.message || "Ringkasan gagal dimuat."); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  const cards = [
    {id:"verified",title:"Titik Air Publik",value:data?.active_verified_points||0,description:"Aktif, terverifikasi, non-simulasi",icon:"droplet",color:"teal",href:"/admin/kelola-titik-air"},
    {id:"pending",title:"Antrean Verifikasi",value:data?.contribution_status?.pending||0,description:"Kontribusi menunggu tinjauan",icon:"clipboard-list",color:"peach",href:"/admin/verifikasi"},
    {id:"activity",title:"Total Titik Air",value:data?.total_water_points||0,description:"Record dalam tabel water_points",icon:"activity",color:"sage",href:"/admin/kelola-titik-air"},
  ];
  return <><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((stat)=> <AdminStatCard key={stat.id} stat={{...stat,value:loading&&!data?"…":stat.value}}/> )}</div>{error&&<div role="alert" className="text-sm text-red-700">{error} <button type="button" onClick={load} className="underline">Coba lagi</button></div>}</>;
}

// ============================================
// FORMAT DATA AUDIT
// ============================================

const STATUS_LABELS = {
  active: "Aktif",
  inactive: "Nonaktif",
  suspend: "Ditangguhkan",
};

function formatActivityDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusChangeBadge({ status }) {
  const styles = {
    active: "bg-[#DDF0E8] text-[#28735E]",
    inactive: "bg-[#F8E5DF] text-[#A3432D]",
    suspend: "bg-[#FDF1D8] text-[#8A6414]",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {STATUS_LABELS[status] || status || "-"}
    </span>
  );
}

// ============================================
// TABEL JEJAK AUDIT DARI SUPABASE
// ============================================

function AuditLogTable({ refreshKey }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_data: 0,
    total_pages: 0,
    has_next_page: false,
    has_previous_page: false,
  });

  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivityLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        actionType: activeFilter,
      });

      const response = await fetch(
        `/api/admin/activity-logs?${params.toString()}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil riwayat aktivitas."
        );
      }

      setLogs(Array.isArray(result.data) ? result.data : []);

      setPagination(
        result.pagination || {
          current_page: page,
          per_page: 10,
          total_data: 0,
          total_pages: 0,
          has_next_page: false,
          has_previous_page: false,
        }
      );
    } catch (err) {
      console.error("[AuditLogTable]", err);
      setError(
        err.message || "Terjadi kesalahan saat mengambil riwayat aktivitas."
      );
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs, refreshKey]);

  function handleFilterChange(value) {
    setActiveFilter(value);
    setPage(1);
  }

  const filterOptions = [
    { label: "Semua", value: "all" },
    { label: "Perubahan status akun", value: "user_status_updated" },
  ];

  return (
    <section
      id="riwayat-aktivitas"
      className={`${adminCard} w-full scroll-mt-6 overflow-hidden`}
    >
      {/* HEADER */}
      <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <History className="size-5 shrink-0 text-aira-primary" />

          <div>
            <h2 className={adminH2}>Jejak audit sistem</h2>

            <p className="mt-0.5 text-xs text-aira-text/55">
              Riwayat aktivitas administratif dari database.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchActivityLogs}
          disabled={loading}
          className={`${adminBtnOutline} self-start sm:self-auto`}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Perbarui Riwayat
        </button>
      </div>

      {/* FILTER (gaya sama dengan tab di C02) */}
      <div className="flex flex-wrap gap-2 px-5 pt-4 sm:px-6">
        {filterOptions.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => handleFilterChange(filter.value)}
            aria-pressed={activeFilter === filter.value}
            className={`inline-flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-aira-secondary/40 ${
              activeFilter === filter.value
                ? "border-aira-primary bg-aira-primary text-white shadow-sm"
                : "border-aira-primary/20 bg-white text-aira-primary hover:bg-aira-bg"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mx-5 mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:mx-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={fetchActivityLogs}
            className="shrink-0 text-sm font-semibold text-red-700 underline"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* TABEL */}
      <div className="overflow-x-auto px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <table className="w-full min-w-225 table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[14%]" />
            <col className="w-[21%]" />
            <col className="w-[24%]" />
            <col className="w-[26%]" />
          </colgroup>

          <thead>
            <tr className="border-b border-aira-primary/10">
              <th className={adminTh}>Waktu</th>
              <th className={adminTh}>Pelaku</th>
              <th className={adminTh}>Aksi</th>
              <th className={adminTh}>Objek</th>
              <th className={adminTh}>Perubahan</th>
            </tr>
          </thead>

          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-aira-text/55"
                >
                  <RefreshCw className="mx-auto mb-2 size-5 animate-spin text-aira-primary" />
                  Memuat riwayat aktivitas...
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr
                  key={log.activity_id}
                  className="border-b border-aira-primary/8 transition-colors last:border-b-0 hover:bg-aira-bg/60"
                >
                  <td className="min-w-0 px-3 py-4 align-middle text-sm leading-snug text-aira-text/70">
                    {formatActivityDate(log.created_at)}
                  </td>

                  <td className="min-w-0 wrap-break-word px-3 py-4 align-middle text-sm font-medium leading-snug text-aira-text">
                    {log.admin_name || "Admin tidak ditemukan"}
                  </td>

                  <td className="min-w-0 px-3 py-4 align-middle">
                    <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-[#E0EDF7] px-2.5 py-1 text-xs font-medium leading-none text-[#28658A]">
                      <ShieldCheck className="size-3.5 shrink-0" />
                      Perubahan status akun
                    </span>
                  </td>

                  <td className="min-w-0 px-3 py-4 align-middle">
                    <p className="wrap-break-word text-sm font-semibold leading-snug text-aira-primary">
                      {log.target_user_name || "Pengguna tidak ditemukan"}
                    </p>
                    <p
                      className="mt-1 truncate text-xs leading-snug text-aira-text/50"
                      title={log.target_user_id}
                    >
                      {log.target_user_id}
                    </p>
                  </td>

                  <td className="min-w-0 px-3 py-4 align-middle">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChangeBadge status={log.old_status} />
                      <ArrowRight className="size-3.5 text-aira-text/40" />
                      <StatusChangeBadge status={log.new_status} />
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-aira-text/55">
                      {log.description || "Perubahan status akun pengguna."}
                    </p>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-aira-text/55"
                >
                  {error
                    ? "Riwayat aktivitas belum dapat ditampilkan."
                    : "Belum ada riwayat aktivitas untuk kategori ini."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER DAN PAGINATION */}
      <div className="flex flex-col gap-3 border-t border-aira-primary/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-aira-text/55">
          Menampilkan {logs.length} dari{" "}
          {Number(pagination.total_data || 0).toLocaleString("id-ID")} aktivitas
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || !pagination.has_previous_page || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className={adminBtnSm}
          >
            <ChevronLeft className="size-4" />
            Sebelumnya
          </button>

          <span className="whitespace-nowrap px-2 text-xs font-medium text-aira-text/65">
            Halaman {pagination.current_page || page} dari{" "}
            {pagination.total_pages || 1}
          </span>

          <button
            type="button"
            disabled={loading || !pagination.has_next_page}
            onClick={() => setPage((current) => current + 1)}
            className={adminBtnSm}
          >
            Selanjutnya
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================
// HALAMAN DASHBOARD ADMIN (C01)
// ============================================

export default function AdminDashboard() {
  const [showUsers, setShowUsers] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const closeUsers = useCallback(() => setShowUsers(false), []);
  const refreshData = useCallback(() => setRefreshKey((key) => key + 1), []);

  return (
    <>
      <AdminShell admin={MOCK_ADMIN}>
        <AdminPageHeader
          title="Ringkasan & Riwayat"
          description="Pantau aktivitas pengelolaan data titik air, kontribusi warga, pengguna, dan status verifikasi dalam satu halaman."
        />

        {/* Statistik titik air dan antrean langsung dari database */}
        <AdminOverviewCards refreshKey={refreshKey} />

        {/* STATISTIK PENGGUNA DARI SUPABASE */}
        <AdminUserStatistics
          refreshKey={refreshKey}
          onManage={() => setShowUsers(true)}
        />

        {/* STATUS KONTRIBUSI */}
        <ContributionStatus refreshKey={refreshKey} />

        {/* RIWAYAT AKTIVITAS DARI SUPABASE */}
        <AuditLogTable refreshKey={refreshKey} />
      </AdminShell>

      {/* PANEL KELOLA STATUS AKUN (bukan screen baru) */}
      {showUsers && (
        <UserManagement onClose={closeUsers} onChanged={refreshData} />
      )}
    </>
  );
} 