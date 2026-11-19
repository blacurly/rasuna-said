import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import AuthCard from "@/components/auth/AuthCard";
import ResetPassword from "@/components/auth/ResetPassword";

export const metadata = {
  title: "Atur Ulang Password | AIRA",
  // Token reset ada di URL halaman ini; jangan ikut terkirim sebagai Referer ke situs lain.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;

  const tokenHash =
    typeof params?.token_hash === "string" ? params.token_hash.trim() : "";

  // Alur utama: tautan email membawa token_hash. Token baru diverifikasi saat password disimpan,
  // jadi membuka halaman ini (termasuk oleh pemindai email) tidak memakai token dan tidak membuat sesi.
  if (tokenHash && params?.type === "recovery") {
    return (
      <AuthCard
        title="Buat password baru"
        subtitle="Masukkan password baru. Setelah disimpan, Anda akan diminta masuk kembali dengan password tersebut."
      >
        <ResetPassword tokenHash={tokenHash} />
      </AuthCard>
    );
  }

  // Tautan lama (PKCE) yang sudah membuat sesi pemulihan lewat /auth/callback.
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Tanpa token maupun sesi, pengguna harus meminta tautan reset baru.
  if (error || !user) {
    redirect("/masuk?error=recovery-session");
  }

  return (
    <AuthCard
      title="Buat password baru"
      subtitle="Masukkan password baru. Setelah disimpan, Anda akan diminta masuk kembali dengan password tersebut."
    >
      <ResetPassword />
    </AuthCard>
  );
}