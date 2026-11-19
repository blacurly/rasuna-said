import { getMyWaterPointContributions } from "@/services/contributionService";
import { tanggalIsoWib } from "@/services/dashboardService";
import { formatTanggalIso } from "@/lib/waktuDashboard";
import { idDiperbaiki, keItemKontribusi } from "@/lib/kontribusiUser";

// Daftar kontribusi milik pengguna yang login untuk halaman B04 (Kontribusi Titik Air).
// Kontribusi yang sudah diperbaiki lewat "Perbaiki dan Kirim Ulang" tidak ditampilkan dua kali.
export async function ambilKontribusiSaya() {
  let baris;
  try {
    baris = await getMyWaterPointContributions();
  } catch {
    return { items: [], gagal: true };
  }

  const digantikan = new Set(baris.map(idDiperbaiki).filter(Boolean));

  const items = baris
    .filter((r) => !digantikan.has(r.contribution_id))
    .map((r) =>
      keItemKontribusi(r, r.submitted_at ? formatTanggalIso(tanggalIsoWib(r.submitted_at)).tanggalPenuh : "-"),
    );

  return { items, gagal: false };
}
