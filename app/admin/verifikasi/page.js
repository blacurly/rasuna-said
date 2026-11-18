import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import AdminShell from "@/components/admin/AdminShell";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import VerificationWorkspace from "@/components/admin/verifikasi-titik-air/VerificationWorkspace";

export default async function VerifikasiPage() {
  const supabase = await createClient();

  // 1. Periksa sesi login.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/masuk");
  }

  // 2. Ambil profil pengguna.
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("user_id, full_name, email, role, account_status")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/masuk");
  }

  // 3. Periksa status akun.
  if (profile.account_status !== "active") {
    redirect("/masuk");
  }

  // 4. Batasi akses hanya untuk admin.
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  // 5. Inisial admin.
  const initials =
    profile.full_name
      ?.split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AA";

  const admin = {
    initials,
    name: profile.full_name || "Admin AIRA",
    role: "Peninjau & pengelola data",
  };

  return (
    <AdminShell admin={admin}>
      <AdminPageHeader
        title="Verifikasi Kontribusi"
        description="Tinjau titik air kiriman warga. Hanya data terverifikasi yang masuk ke direktori publik."
      />

      <VerificationWorkspace />
    </AdminShell>
  );
} 