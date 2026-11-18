import LoginScreen from "@/components/auth/LoginScreen";

export const metadata = {
  title: "Masuk - AIRA",
};

const PESAN_SUKSES = {
  password_updated: "Password berhasil diperbarui. Silakan masuk dengan email dan password baru.",
  verified: "Email berhasil diverifikasi. Silakan masuk.",
};

const PESAN_ERROR = {
  "invalid-link": "Tautan tidak valid. Silakan minta tautan baru.",
  "verification-failed":
    "Verifikasi gagal atau tautan sudah kedaluwarsa. Silakan minta tautan baru.",
  "recovery-session":
    "Tautan reset password tidak valid atau sudah kedaluwarsa. Pilih “Lupa kata sandi?” untuk meminta tautan baru.",
  inactive: "Akun Anda tidak aktif.",
  profile: "Profil akun tidak ditemukan.",
  role: "Akun Anda tidak memiliki akses.",
};

const ambil = (v) => (typeof v === "string" ? v : "");

export default async function Login({ searchParams }) {
  const params = await searchParams;

  const error = PESAN_ERROR[ambil(params?.error)];
  const sukses = Object.keys(PESAN_SUKSES).find((k) => ambil(params?.[k]) === "1");

  const notice = error
    ? { type: "error", text: error }
    : sukses
      ? { type: "success", text: PESAN_SUKSES[sukses] }
      : null;

  return <LoginScreen notice={notice} initialForgot={ambil(params?.forgot) === "1"} />;
}