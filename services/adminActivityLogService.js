const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function getAdminActivityLogs(
  supabase,
  options = {}
) {
  const page = Number(options.page) || DEFAULT_PAGE;
  const limit = Math.min(
    Number(options.limit) || DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const actionType = options.actionType || "all";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 1. Ambil riwayat audit.
  let query = supabase
    .from("admin_activity_logs")
    .select(
      `
        activity_id,
        admin_id,
        action_type,
        target_user_id,
        old_status,
        new_status,
        description,
        metadata,
        created_at
      `,
      { count: "exact" }
    );

  if (actionType !== "all") {
    query = query.eq("action_type", actionType);
  }

  const {
    data: logs,
    error,
    count,
  } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Get admin activity logs error:", error);
    throw error;
  }

  // 2. Ambil ID admin dan pengguna sasaran.
  const userIds = [
    ...new Set(
      (logs || []).flatMap((log) => [
        log.admin_id,
        log.target_user_id,
      ])
    ),
  ];

  // 3. Ambil nama pengguna dari tabel users.
  let userMap = new Map();

  if (userIds.length > 0) {
    const {
      data: users,
      error: userError,
    } = await supabase
      .from("users")
      .select("user_id, full_name")
      .in("user_id", userIds);

    if (userError) {
      console.error("Get audit user profiles error:", userError);
      throw userError;
    }

    userMap = new Map(
      (users || []).map((user) => [
        user.user_id,
        user.full_name,
      ])
    );
  }

  // 4. Gabungkan data audit dan nama pengguna.
  const formattedLogs = (logs || []).map((log) => ({
    activity_id: log.activity_id,
    admin_id: log.admin_id,
    admin_name:
      userMap.get(log.admin_id) || "Admin tidak ditemukan",

    action_type: log.action_type,

    target_user_id: log.target_user_id,
    target_user_name:
      userMap.get(log.target_user_id) || "Pengguna tidak ditemukan",

    old_status: log.old_status,
    new_status: log.new_status,
    description: log.description,
    metadata: log.metadata,
    created_at: log.created_at,
  }));

  const totalData = count || 0;
  const totalPages = Math.ceil(totalData / limit);

  return {
    data: formattedLogs,
    pagination: {
      current_page: page,
      per_page: limit,
      total_data: totalData,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_previous_page: page > 1,
    },
  };
} 