import { requireApiAdmin } from "@/lib/auth/authorization";
import { apiSuccess, handleApiError } from "@/lib/api/response";

export async function GET() {
  try {
    const { supabase } = await requireApiAdmin();
    const [points, contributions, users] = await Promise.all([
      supabase.from("water_points").select("water_point_id, verification_status, is_active, is_simulation", { count: "exact" }),
      supabase.from("water_point_contributions").select("contribution_id, status", { count: "exact" }),
      supabase.from("users").select("user_id", { count: "exact", head: true }),
    ]);
    for (const result of [points, contributions, users]) if (result.error) throw result.error;
    const pointRows = points.data || [];
    const contributionRows = contributions.data || [];
    const byStatus = { pending: 0, approved: 0, needs_revision: 0, rejected: 0 };
    contributionRows.forEach((row) => { if (row.status in byStatus) byStatus[row.status] += 1; });
    return apiSuccess({
      total_water_points: points.count ?? pointRows.length,
      active_verified_points: pointRows.filter((p) => p.is_active && p.verification_status === "verified" && !p.is_simulation).length,
      inactive_points: pointRows.filter((p) => !p.is_active).length,
      simulation_points: pointRows.filter((p) => p.is_simulation).length,
      total_contributions: contributions.count ?? contributionRows.length,
      contribution_status: byStatus,
      total_users: users.count ?? 0,
    }, { message: "Ringkasan dashboard admin berhasil dimuat." });
  } catch (error) { return handleApiError(error, "Ringkasan dashboard admin gagal dimuat."); }
}
