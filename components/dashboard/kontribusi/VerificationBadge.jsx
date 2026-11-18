import { ShieldAlert, ShieldCheck } from "lucide-react";

// Lencana status verifikasi sesuai Figma Make (Directory.tsx).
const warna = {
  Terverifikasi: "bg-aira-primary text-white",
  "Menunggu Verifikasi": "bg-aira-secondary/20 text-aira-info-text",
  "Perlu Perbaikan": "bg-aira-warning-border text-aira-warning-text",
  Ditolak: "bg-aira-peach/50 text-aira-danger-text",
};

export default function VerificationBadge({ status }) {
  const Icon = status === "Terverifikasi" ? ShieldCheck : ShieldAlert;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold leading-normal ${
        warna[status] ?? warna["Menunggu Verifikasi"]
      }`}
    >
      <Icon className="size-3.5" /> {status}
    </span>
  );
}
