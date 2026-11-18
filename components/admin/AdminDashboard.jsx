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

import AdminSidebar from "@/components/admin/AdminSidebar";

import {
  MOCK_ADMIN,
  MOCK_ADMIN_STATS,
  MOCK_CONTRIBUTION_STATUS,
} from "@/data/admin/mockAdmin";

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

// ============================================
// KARTU STATISTIK DASHBOARD
// ============================================

function AdminStatCard({ stat }) {
  const Icon = statIcons[stat.icon] || Activity;

  // Card aktivitas diarahkan ke bagian riwayat pada halaman yang sama.
  // Dua card lainnya tetap menggunakan href dari mockAdmin.js.
  const destination =
    stat.title === "Aktivitas Admin Hari Ini"
      ? "#riwayat-aktivitas"
      : stat.href;

  const isActivityCard =
    stat.title === "Aktivitas Admin Hari Ini";

  return (
    <Link
      href={destination || "#"}
      aria-label={`Lihat ${stat.title}`}
      className="group flex min-h-[136px] flex-col justify-between rounded-[20px] border border-aira-primary/5 bg-white p-5 shadow-[0_8px_28px_-10px_rgba(23,107,120,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aira-primary focus-visible:ring-offset-2"
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
          <ArrowRight
            className={`ml-1 inline size-3.5 transition-transform duration-200 ${
              isActivityCard
                ? "group-hover:translate-x-1"
                : "group-hover:translate-x-1"
            }`}
          />
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
    <div className="flex min-h-[120px] flex-col justify-between rounded-[18px] border border-aira-primary/5 bg-white p-4 shadow-[0_8px_28px_-10px_rgba(23,107,120,0.12)] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-aira-text/75">
          {stat.title}
        </p>

        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
        >
          <Icon className="size-[18px]" />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-aira-primary sm:text-3xl">
          {Number(value || 0).toLocaleString("id-ID")}
        </p>

        <p className="mt-1 text-xs text-aira-text/55">
          {stat.description}
        </p>
      </div>
    </div>
  );
}

// ============================================
// INTEGRASI API STATISTIK PENGGUNA
// ============================================

function AdminUserStatistics() {
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
      setError(
        err.message || "Terjadi kesalahan saat mengambil statistik."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-aira-primary">
            Statistik Pengguna
          </h2>

          <p className="text-sm text-aira-text/60">
            Ringkasan akun pengguna yang terdaftar di AIRA.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUserStats}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-aira-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-aira-primary transition-colors hover:bg-aira-sage/20 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin" : ""}`}
          />
          Perbarui Data
        </button>
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
                className="min-h-[120px] animate-pulse rounded-[18px] border border-aira-primary/5 bg-white p-5"
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

            <span className="font-semibold text-aira-text">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
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
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
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

function AuditLogTable() {
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
  }, [fetchActivityLogs]);

  function handleFilterChange(value) {
    setActiveFilter(value);
    setPage(1);
  }

  const filterOptions = [
    { label: "Semua", value: "all" },
    {
      label: "Perubahan status akun",
      value: "user_status_updated",
    },
  ];

  return (
  <section
    id="riwayat-aktivitas"
    className="w-full scroll-mt-6 overflow-hidden rounded-[22px] border border-aira-primary/5 bg-white shadow-[0_8px_28px_-10px_rgba(23,107,120,0.16)]"
  >
      {/* HEADER */}
      <div className="flex flex-col gap-4 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <History className="size-5 shrink-0 text-aira-primary" />

          <div>
            <h2 className="text-base font-semibold tracking-tight text-aira-primary sm:text-lg">
              Jejak audit sistem
            </h2>

            <p className="mt-0.5 text-xs text-aira-text/55">
              Riwayat aktivitas administratif dari database.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchActivityLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-aira-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-aira-primary transition-colors hover:bg-aira-sage/20 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin" : ""}`}
          />
          Perbarui Riwayat
        </button>
      </div>

      {/* FILTER */}
      <div className="flex flex-wrap gap-2 px-5 pt-4 sm:px-6">
        {filterOptions.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => handleFilterChange(filter.value)}
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
        <table className="w-full min-w-[850px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[19%]" />
            <col className="w-[21%]" />
            <col className="w-[26%]" />
          </colgroup>

          <thead>
            <tr className="border-b border-aira-primary/10 text-xs font-semibold uppercase tracking-wide text-aira-text/55">
              <th className="px-2 pb-3 pt-1">Waktu</th>
              <th className="px-2 pb-3 pt-1">Pelaku</th>
              <th className="px-2 pb-3 pt-1">Aksi</th>
              <th className="px-2 pb-3 pt-1">Objek</th>
              <th className="px-2 pb-3 pt-1">Perubahan</th>
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
                  className="border-b border-aira-primary/[0.07] transition-colors last:border-0 hover:bg-aira-bg/60"
                >
                  <td className="px-2 py-4 align-middle text-sm leading-relaxed text-aira-text/70">
                    {formatActivityDate(log.created_at)}
                  </td>

                  <td className="break-words px-2 py-4 align-middle text-sm font-medium leading-relaxed text-aira-text">
                    {log.admin_name || "Admin tidak ditemukan"}
                  </td>

                  <td className="px-2 py-4 align-middle">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#E0EDF7] px-3 py-1.5 text-xs font-medium text-[#28658A]">
                      <ShieldCheck className="size-4 shrink-0" />
                      Perubahan status akun
                    </span>
                  </td>

                  <td className="break-words px-2 py-4 align-middle text-sm font-medium leading-relaxed text-aira-primary">
                    <p>{log.target_user_name || "Pengguna tidak ditemukan"}</p>
                    <p className="mt-1 text-xs font-normal text-aira-text/50">
                      {log.target_user_id}
                    </p>
                  </td>

                  <td className="px-2 py-4 align-middle text-sm leading-relaxed text-aira-text/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChangeBadge status={log.old_status} />

                      <ArrowRight className="size-3.5 text-aira-text/40" />

                      <StatusChangeBadge status={log.new_status} />
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-aira-text/60">
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
      <div className="flex flex-col gap-3 border-t border-aira-primary/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-aira-text/55 sm:text-sm">
          Menampilkan {logs.length} dari{" "}
          {Number(pagination.total_data || 0).toLocaleString("id-ID")} aktivitas
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={
              loading ||
              !pagination.has_previous_page ||
              page <= 1
            }
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-aira-primary/20 px-3 py-2 text-xs font-semibold text-aira-primary transition-colors hover:bg-aira-sage/20 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="inline-flex items-center gap-1 rounded-lg border border-aira-primary/20 px-3 py-2 text-xs font-semibold text-aira-primary transition-colors hover:bg-aira-sage/20 disabled:cursor-not-allowed disabled:opacity-40"
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
// HALAMAN DASHBOARD ADMIN
// ============================================

export default function AdminDashboard() {
  return (
    <main className="min-h-screen scroll-smooth bg-aira-bg"> 
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
              pengguna, dan status verifikasi dalam satu halaman.
            </p>
          </header>

          {/* STATISTIK TITIK AIR DAN AKTIVITAS */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {MOCK_ADMIN_STATS.map((stat) => (
              <AdminStatCard key={stat.id} stat={stat} />
            ))}
          </section>

          {/* STATISTIK PENGGUNA DARI SUPABASE */}
          <AdminUserStatistics />

          {/* STATUS KONTRIBUSI */}
          <ContributionStatus />

          {/* RIWAYAT AKTIVITAS DARI SUPABASE */}
          <AuditLogTable />
        </div>
      </div>
    </main>
  );
} 