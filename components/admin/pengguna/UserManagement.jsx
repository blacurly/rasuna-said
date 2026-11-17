"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  UserRound,
  Mail,
  Phone,
  CalendarDays,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Ban,
} from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { MOCK_ADMIN } from "@/data/admin/mockAdmin";

/* =========================================
   KONSTANTA
========================================= */

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "suspend", label: "Ditangguhkan" },
];

const ROLE_OPTIONS = [
  { value: "", label: "Semua peran" },
  { value: "user", label: "Pengguna" },
  { value: "admin", label: "Admin" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "suspend", label: "Ditangguhkan" },
];

/* =========================================
   FORMAT TANGGAL
========================================= */

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* =========================================
   BADGE STATUS
========================================= */

function UserStatusBadge({ status }) {
  const styles = {
    active: "bg-[#DDF0E8] text-[#28735E]",
    inactive: "bg-[#F4EBDD] text-[#8A6414]",
    suspend: "bg-[#F8E0D9] text-[#A3432D]",
  };

  const labels = {
    active: "Aktif",
    inactive: "Nonaktif",
    suspend: "Ditangguhkan",
  };

  const icons = {
    active: CheckCircle2,
    inactive: Clock3,
    suspend: Ban,
  };

  const Icon = icons[status] || AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      <Icon className="size-3.5" />
      {labels[status] || status || "Tidak diketahui"}
    </span>
  );
}

/* =========================================
   BADGE PERAN
========================================= */

function UserRoleBadge({ role }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        role === "admin"
          ? "bg-[#E0EDF7] text-[#28658A]"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {role === "admin" ? "Admin" : "Pengguna"}
    </span>
  );
}

/* =========================================
   KOMPONEN DETAIL PENGGUNA
========================================= */

function UserDetailModal({
  userId,
  onClose,
  onStatusUpdated,
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil detail pengguna."
        );
      }

      setUser(result.data);
      setSelectedStatus(result.data.account_status);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleStatusUpdate() {
    if (!user || selectedStatus === user.account_status) return;

    const selectedLabel =
      STATUS_OPTIONS.find((item) => item.value === selectedStatus)?.label ||
      selectedStatus;

    const confirmed = window.confirm(
      `Apakah kamu yakin ingin mengubah status akun ${user.full_name} menjadi "${selectedLabel}"?`
    );

    if (!confirmed) return;

    try {
      setUpdating(true);
      setUpdateMessage("");

      const response = await fetch(
        `/api/admin/users/${userId}/status`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account_status: selectedStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal memperbarui status akun."
        );
      }

      setUpdateMessage(
        result.message || "Status akun berhasil diperbarui."
      );

      await fetchDetail();
      await onStatusUpdated();
    } catch (err) {
      setUpdateMessage(
        err.message || "Terjadi kesalahan saat memperbarui status."
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-aira-primary/10 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium text-aira-primary/60">
              Manajemen Pengguna
            </p>
            <h2
              id="user-detail-title"
              className="mt-1 text-lg font-bold text-aira-primary"
            >
              Detail akun pengguna
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail pengguna"
            className="rounded-full p-2 text-aira-text/60 transition hover:bg-aira-bg hover:text-aira-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {loading && (
            <div className="py-12 text-center text-sm text-aira-text/60">
              Memuat detail pengguna...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
              <button
                type="button"
                onClick={fetchDetail}
                className="ml-2 font-semibold underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          {!loading && user && (
            <>
              <div className="flex flex-col gap-4 rounded-2xl bg-aira-bg p-5 sm:flex-row sm:items-center">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-aira-primary shadow-sm">
                  <UserRound className="size-7" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-lg font-bold text-aira-primary">
                    {user.full_name || "Nama belum diisi"}
                  </h3>
                  <p className="mt-1 break-all text-sm text-aira-text/65">
                    {user.email}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <UserRoleBadge role={user.role} />
                    <UserStatusBadge status={user.account_status} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-aira-primary">
                  Informasi akun
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-aira-primary/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-aira-text/55">
                      <UserRound className="size-4" />
                      Nama lengkap
                    </div>
                    <p className="mt-2 break-words text-sm font-medium text-aira-text">
                      {user.full_name || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-aira-primary/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-aira-text/55">
                      <Mail className="size-4" />
                      Email
                    </div>
                    <p className="mt-2 break-all text-sm font-medium text-aira-text">
                      {user.email || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-aira-primary/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-aira-text/55">
                      <Phone className="size-4" />
                      Nomor telepon
                    </div>
                    <p className="mt-2 text-sm font-medium text-aira-text">
                      {user.phone_number || "Belum tersedia"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-aira-primary/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-aira-text/55">
                      <ShieldCheck className="size-4" />
                      Peran akun
                    </div>
                    <p className="mt-2 text-sm font-medium text-aira-text">
                      {user.role === "admin" ? "Admin" : "Pengguna"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-aira-primary/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-aira-text/55">
                      <CalendarDays className="size-4" />
                      Tanggal dibuat
                    </div>
                    <p className="mt-2 text-sm font-medium text-aira-text">
                      {formatDate(user.created_at)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-aira-primary/10 p-4">
                    <div className="flex items-center gap-2 text-xs text-aira-text/55">
                      <RefreshCw className="size-4" />
                      Terakhir diperbarui
                    </div>
                    <p className="mt-2 text-sm font-medium text-aira-text">
                      {formatDate(user.updated_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-aira-primary/10 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-aira-primary">
                  Pengelolaan status akun
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-aira-text/60">
                  Perubahan status akan memengaruhi akses akun pengguna.
                  Perubahan ini hanya mengubah status akun, bukan menghapus
                  data pengguna.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value)
                    }
                    disabled={updating}
                    className="min-h-11 flex-1 rounded-xl border border-aira-primary/15 bg-white px-3 text-sm text-aira-text outline-none focus:border-aira-primary"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleStatusUpdate}
                    disabled={
                      updating ||
                      selectedStatus === user.account_status
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-aira-primary px-5 text-sm font-semibold text-white transition hover:bg-aira-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updating && (
                      <RefreshCw className="size-4 animate-spin" />
                    )}
                    {updating ? "Menyimpan..." : "Simpan perubahan"}
                  </button>
                </div>

                {updateMessage && (
                  <p className="mt-3 text-sm text-aira-primary">
                    {updateMessage}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-aira-primary/10 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-aira-primary/20 px-5 py-2.5 text-sm font-semibold text-aira-primary transition hover:bg-aira-bg"
          >
            Tutup
          </button>
        </div>
      </section>
    </div>
  );
}

/* =========================================
   HALAMAN MANAJEMEN PENGGUNA
========================================= */

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_data: 0,
    total_pages: 0,
    has_next_page: false,
    has_previous_page: false,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        sortBy: "created_at",
        sortOrder: "desc",
      });

      if (search.trim()) params.set("search", search.trim());
      if (role) params.set("role", role);
      if (accountStatus) {
        params.set("accountStatus", accountStatus);
      }

      const response = await fetch(
        `/api/admin/users?${params.toString()}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil daftar pengguna."
        );
      }

      setUsers(Array.isArray(result.data) ? result.data : []);
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
      setError(err.message || "Terjadi kesalahan saat mengambil data.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, role, accountStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleRoleChange(value) {
    setPage(1);
    setRole(value);
  }

  function handleStatusChange(value) {
    setPage(1);
    setAccountStatus(value);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setRole("");
    setAccountStatus("");
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-aira-bg">
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-start gap-6 px-4 py-6 sm:px-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <AdminSidebar admin={MOCK_ADMIN} />

        <div className="min-w-0 space-y-5">
          {/* HEADER */}
          <header className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-aira-primary/65">
              <span>Panel Admin</span>
              <span>/</span>
              <span>Kelola Pengguna</span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-aira-primary sm:text-3xl">
                  Kelola Pengguna
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-aira-text/65">
                  Lihat informasi akun, pantau peran, dan kelola status
                  pengguna AIRA.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-aira-primary/20 bg-white px-4 text-sm font-semibold text-aira-primary transition hover:bg-aira-bg disabled:opacity-50 sm:self-auto"
              >
                <RefreshCw
                  className={`size-4 ${loading ? "animate-spin" : ""}`}
                />
                Segarkan
              </button>
            </div>
          </header>

          {/* RINGKASAN JUMLAH */}
          <section className="rounded-[20px] border border-aira-primary/5 bg-white p-5 shadow-[0_8px_28px_-10px_rgba(23,107,120,0.12)]">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#E0F1F0] text-aira-primary">
                <Users className="size-5" />
              </div>

              <div>
                <p className="text-xs font-medium text-aira-text/60">
                  Total hasil pengguna
                </p>
                <p className="text-2xl font-bold text-aira-primary">
                  {loading ? "..." : pagination.total_data}
                </p>
              </div>
            </div>
          </section>

          {/* FILTER DAN PENCARIAN */}
          <section className="rounded-[20px] border border-aira-primary/5 bg-white p-5 shadow-[0_8px_28px_-10px_rgba(23,107,120,0.12)]">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-aira-primary">
                Pencarian dan filter
              </h2>
              <p className="mt-1 text-xs text-aira-text/55">
                Cari berdasarkan nama atau email, lalu sesuaikan filter.
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-aira-text/40" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Cari nama atau email pengguna..."
                  className="min-h-11 w-full rounded-xl border border-aira-primary/15 bg-white pl-10 pr-4 text-sm text-aira-text outline-none transition placeholder:text-aira-text/40 focus:border-aira-primary"
                />
              </div>

              <button
                type="submit"
                className="min-h-11 rounded-xl bg-aira-primary px-5 text-sm font-semibold text-white transition hover:bg-aira-primary/90"
              >
                Cari pengguna
              </button>
            </form>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={role}
                onChange={(event) => handleRoleChange(event.target.value)}
                className="min-h-11 rounded-xl border border-aira-primary/15 bg-white px-3 text-sm text-aira-text outline-none focus:border-aira-primary"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={accountStatus}
                onChange={(event) =>
                  handleStatusChange(event.target.value)
                }
                className="min-h-11 rounded-xl border border-aira-primary/15 bg-white px-3 text-sm text-aira-text outline-none focus:border-aira-primary"
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {(search || role || accountStatus) && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 text-xs font-semibold text-aira-primary underline underline-offset-2"
              >
                Reset pencarian dan filter
              </button>
            )}
          </section>

          {/* TABEL PENGGUNA */}
          <section className="overflow-hidden rounded-[20px] border border-aira-primary/5 bg-white shadow-[0_8px_28px_-10px_rgba(23,107,120,0.12)]">
            <div className="flex flex-col gap-1 border-b border-aira-primary/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-aira-primary">
                  Daftar pengguna
                </h2>
                <p className="mt-1 text-xs text-aira-text/55">
                  Informasi akun yang terdaftar pada sistem AIRA.
                </p>
              </div>

              <span className="text-xs text-aira-text/55">
                {pagination.total_data} pengguna
              </span>
            </div>

            {error && (
              <div className="m-5 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={fetchUsers}
                    className="mt-1 font-semibold underline"
                  >
                    Coba muat ulang
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-aira-primary/10 bg-aira-bg/50 text-xs font-semibold uppercase tracking-wide text-aira-text/55">
                    <th className="px-5 py-4">Pengguna</th>
                    <th className="px-4 py-4">Peran</th>
                    <th className="px-4 py-4">Status akun</th>
                    <th className="px-4 py-4">Tanggal bergabung</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-sm text-aira-text/55"
                      >
                        Memuat daftar pengguna...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-sm text-aira-text/55"
                      >
                        Tidak ada pengguna yang sesuai dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.user_id}
                        className="border-b border-aira-primary/[0.07] transition-colors last:border-0 hover:bg-aira-bg/40"
                      >
                        <td className="px-5 py-4">
                          <p className="max-w-[230px] break-words text-sm font-semibold text-aira-primary">
                            {user.full_name || "Nama belum diisi"}
                          </p>
                          <p className="mt-1 max-w-[230px] break-all text-xs text-aira-text/55">
                            {user.email}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <UserRoleBadge role={user.role} />
                        </td>

                        <td className="px-4 py-4">
                          <UserStatusBadge status={user.account_status} />
                        </td>

                        <td className="px-4 py-4 text-sm text-aira-text/65">
                          {formatDate(user.created_at)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedUserId(user.user_id)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-aira-primary/20 px-3 py-2 text-xs font-semibold text-aira-primary transition hover:bg-aira-bg"
                          >
                            <Eye className="size-3.5" />
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col gap-3 border-t border-aira-primary/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-aira-text/55">
                Halaman {pagination.current_page || 1} dari{" "}
                {pagination.total_pages || 1}
                {" · "}
                Total {pagination.total_data || 0} pengguna
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={
                    loading || !pagination.has_previous_page
                  }
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-aira-primary/15 px-3 text-xs font-semibold text-aira-primary transition hover:bg-aira-bg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                  Sebelumnya
                </button>

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={loading || !pagination.has_next_page}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-aira-primary/15 px-3 text-xs font-semibold text-aira-primary transition hover:bg-aira-bg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* MODAL DETAIL */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onStatusUpdated={fetchUsers}
        />
      )}
    </main>
  );
} 