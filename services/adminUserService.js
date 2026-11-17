import { createClient } from "@/lib/supabase/server";

/**
 * Konfigurasi pengelolaan pengguna admin.
 */
const VALID_ROLES = ["admin", "user"];

const VALID_ACCOUNT_STATUSES = [
  "active",
  "inactive",
  "suspend",
];

const ALLOWED_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "full_name",
  "email",
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * Kolom pengguna yang boleh ditampilkan melalui API admin.
 */
const USER_SELECT_FIELDS = `
  user_id,
  full_name,
  email,
  phone_number,
  role,
  account_status,
  created_at,
  updated_at
`;

/**
 * Membersihkan parameter pencarian.
 * Membatasi panjang input dan menghindari karakter
 * khusus yang dapat mengganggu ekspresi filter PostgREST.
 */
function sanitizeSearchTerm(value) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .slice(0, 100)
    .replace(/[,%_.*()\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Memastikan nomor halaman merupakan bilangan positif.
 */
function normalizePage(value) {
  const page = Number(value);

  if (!Number.isInteger(page) || page < 1) {
    return DEFAULT_PAGE;
  }

  return page;
}

/**
 * Memastikan jumlah data per halaman berada dalam batas.
 */
function normalizeLimit(value) {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(limit, MAX_LIMIT);
}

/**
 * Mengambil statistik seluruh pengguna.
 *
 * Statistik:
 * - total_users
 * - total_admins
 * - total_regular_users
 * - active_users
 * - inactive_users
 * - suspended_users
 */
export async function getAdminUserStats() {
  const supabase = await createClient();

  const [
    totalResult,
    adminResult,
    regularResult,
    activeResult,
    inactiveResult,
    suspendedResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("user_id", { count: "exact", head: true }),

    supabase
      .from("users")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin"),

    supabase
      .from("users")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "user"),

    supabase
      .from("users")
      .select("user_id", { count: "exact", head: true })
      .eq("account_status", "active"),

    supabase
      .from("users")
      .select("user_id", { count: "exact", head: true })
      .eq("account_status", "inactive"),

    supabase
      .from("users")
      .select("user_id", { count: "exact", head: true })
      .eq("account_status", "suspend"),
  ]);

  const results = [
    totalResult,
    adminResult,
    regularResult,
    activeResult,
    inactiveResult,
    suspendedResult,
  ];

  const failedResult = results.find((result) => result.error);

  if (failedResult) {
    console.error(
      "[getAdminUserStats]",
      failedResult.error.message
    );

    throw new Error("Gagal mengambil statistik pengguna.");
  }

  return {
    total_users: totalResult.count ?? 0,
    total_admins: adminResult.count ?? 0,
    total_regular_users: regularResult.count ?? 0,
    active_users: activeResult.count ?? 0,
    inactive_users: inactiveResult.count ?? 0,
    suspended_users: suspendedResult.count ?? 0,
  };
}

/**
 * Mengambil daftar pengguna dengan:
 * - Pencarian nama dan email
 * - Filter role
 * - Filter status akun
 * - Pagination
 * - Pengurutan data
 *
 * Parameter:
 * {
 *   page: 1,
 *   limit: 10,
 *   search: "",
 *   role: "",
 *   accountStatus: "",
 *   sortBy: "created_at",
 *   sortOrder: "desc"
 * }
 */
export async function getAdminUsers(options = {}) {
  const supabase = await createClient();

  const page = normalizePage(options.page);
  const limit = normalizeLimit(options.limit);

  const search = sanitizeSearchTerm(options.search);

  const role = VALID_ROLES.includes(options.role)
    ? options.role
    : "";

  const accountStatus = VALID_ACCOUNT_STATUSES.includes(
    options.accountStatus
  )
    ? options.accountStatus
    : "";

  const sortBy = ALLOWED_SORT_FIELDS.includes(options.sortBy)
    ? options.sortBy
    : "created_at";

  const sortOrder =
    options.sortOrder === "asc" ? "asc" : "desc";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("users")
    .select(USER_SELECT_FIELDS, { count: "exact" });

  // Pencarian berdasarkan nama atau email.
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  // Filter role.
  if (role) {
    query = query.eq("role", role);
  }

  // Filter status akun.
  if (accountStatus) {
    query = query.eq("account_status", accountStatus);
  }

  // Pengurutan dan pagination.
  const {
    data,
    error,
    count,
  } = await query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(from, to);

  if (error) {
    console.error("[getAdminUsers]", error.message);

    throw new Error("Gagal mengambil daftar pengguna.");
  }

  const total = count ?? 0;

  return {
    users: data ?? [],
    pagination: {
      current_page: page,
      per_page: limit,
      total_data: total,
      total_pages: Math.ceil(total / limit),
      has_next_page: page * limit < total,
      has_previous_page: page > 1,
    },
  };
}

/**
 * Mengambil detail satu pengguna berdasarkan user_id.
 */
export async function getAdminUserById(userId) {
  if (
    typeof userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId
    )
  ) {
    return null;
  }

  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("users")
    .select(USER_SELECT_FIELDS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getAdminUserById]", error.message);

    throw new Error("Gagal mengambil detail pengguna.");
  }

  return data ?? null;
}

/**
 * Mengubah status akun pengguna melalui PostgreSQL RPC.
 *
 * Status yang diperbolehkan:
 * - active
 * - inactive
 * - suspend
 */
export async function updateAdminUserStatus(userId, newStatus) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "admin_update_user_status",
    {
      p_target_user_id: userId,
      p_new_status: newStatus,
    }
  );

  if (error) {
    console.error("Update admin user status error:", error);
    throw error;
  }

  return data;
}