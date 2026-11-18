import HeroDashboard from "@/components/dashboard/beranda/HeroDashboard";
import MenuCepat from "@/components/dashboard/beranda/MenuCepat";
import StatusAirCard from "@/components/dashboard/beranda/StatusAirCard";
import { ambilProfilDashboard } from "@/lib/dashboardProfile";
import { hitungStatusDashboard } from "@/lib/statusDashboard";
import { formatTanggalIso, salamWaktu, tanggalLengkap } from "@/lib/waktuDashboard";
import { ambilDataDashboard } from "@/services/dashboardService";

export const metadata = {
  title: "Dashboard - AIRA",
};

// B01 - Dashboard User. Dua versi: User Baru (belum ada catatan) dan User Lama (sudah ada catatan).
export default async function DashboardPage() {
  const profile = await ambilProfilDashboard();
  const { keluarga, catatan, kontribusi } = await ambilDataDashboard();

  const terbaru = catatan[0] ?? null;
  const status = terbaru
    ? hitungStatusDashboard({
        liter: terbaru.liter,
        anggota: keluarga.anggota,
        anggotaMhm: keluarga.anggotaMhm,
        kondisiSumberAir: keluarga.kondisiSumberAir,
      })
    : null;
  const tanggal = terbaru ? formatTanggalIso(terbaru.tanggal) : null;
  const kontribusiMenunggu = kontribusi.filter((k) => k.status === "Menunggu Verifikasi").length;

  return (
    <div className="space-y-6">
      <HeroDashboard
        tanggal={tanggalLengkap()}
        salam={salamWaktu()}
        nama={profile.full_name || "Pengguna AIRA"}
        baru={!terbaru}
      />

      {/* User Baru (belum ada catatan): kartu status tidak ditampilkan. */}
      {terbaru && status && (
        <StatusAirCard
          status={status}
          catatan={terbaru}
          keluarga={keluarga}
          tanggalSingkat={tanggal.tanggalSingkat}
          tanggalPenuh={tanggal.tanggalPenuh}
        />
      )}

      <MenuCepat
        adaHasil={Boolean(terbaru)}
        jumlahCatatan={catatan.length}
        kontribusiMenunggu={kontribusiMenunggu}
      />
    </div>
  );
}
