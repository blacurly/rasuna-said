import { redirect } from "next/navigation";

// Layar Kelola Pengguna tidak ada di PRD (C01–C03).
// Fungsinya dipindahkan ke panel di halaman Ringkasan & Riwayat (/admin).
export default function AdminPenggunaPage() {
  redirect("/admin");
} 