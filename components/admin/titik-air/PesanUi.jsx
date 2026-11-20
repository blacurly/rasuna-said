import { AlertCircle } from "lucide-react";

// Kotak pesan galat (merah muda). Dipakai di modal Edit, Tambah, dan dialog Hapus.
export function Alert({ children }) {
  return (
    <p
      role="alert"
      className="flex gap-3 rounded-[16px] border border-[#e8b4a8] bg-[#fdecea] p-4 text-base text-[#8a2f1c]"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// Pesan sukses di atas kartu tabel (hijau sage). Tidak tampil jika teks kosong.
export function Toast({ text }) {
  if (!text) return null;

  return (
    <p
      role="status"
      className="rounded-[16px] border border-aira-sage bg-aira-sage/50 px-5 py-3 font-medium text-aira-primary-dark"
    >
      {text}
    </p>
  );
}
