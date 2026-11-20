import DashboardPageHead from "@/components/dashboard/DashboardPageHead";
import ProfilKeluargaForm from "@/components/dashboard/kondisi-air/ProfilKeluargaForm";
import RingkasanKondisi from "@/components/dashboard/kondisi-air/RingkasanKondisi";
import RiwayatPerhitungan from "@/components/dashboard/kondisi-air/RiwayatPerhitungan";

import { ambilProfilDashboard } from "@/lib/dashboardProfile";
import { hitungStatusDashboard } from "@/lib/statusDashboard";
import { formatTanggalIso } from "@/lib/waktuDashboard";

import { ambilDataDashboard } from "@/services/dashboardService";

export const metadata = {
  title: "Kondisi Air Rumah Tangga - AIRA",
};

// B02 - Kondisi Air Rumah Tangga: ringkasan, riwayat perhitungan, dan profil keluarga.
// Dua versi: User Baru (belum ada catatan) dan User Lama (sudah ada catatan).
export default async function KondisiAirRumahTanggaPage() {
  const profile = await ambilProfilDashboard();

  // Data keluarga dan catatan ringkasan tetap menggunakan sumber sebelumnya.
  // `riwayat` = catatan asal Kalkulator. Datanya sudah digabung dari input_snapshot
  // dan tabel households (asesmen yang disimpan lewat RPC tidak punya snapshot).
  const {
    keluarga,
    catatan,
    riwayat: dataRiwayat,
  } = await ambilDataDashboard();

  // Ringkasan tetap memakai catatan terbaru dari dashboard.
  const terbaru = catatan[0] ?? null;

  const status = terbaru
    ? hitungStatusDashboard({
        liter: terbaru.liter,
        anggota: keluarga.anggota,
        anggotaMhm: keluarga.anggotaMhm,
        kondisiSumberAir: keluarga.kondisiSumberAir,
      })
    : null;

  const tanggal = terbaru
    ? formatTanggalIso(terbaru.tanggal)
    : null;

  // Tambahkan tanggal tampil dan status ketahanan untuk setiap catatan.
  const baris = dataRiwayat.map((r) => ({
    ...r,
    tanggalPenuh: formatTanggalIso(r.tanggal).tanggalPenuh,
    status: hitungStatusDashboard({
      liter: r.liter,
      anggota: r.anggota,
      anggotaMhm: r.anggotaMhm,
      kondisiSumberAir: r.kondisiSumberAir,
    }),
  }));

  // User Baru: belum ada catatan kondisi air (B02 versi User Baru).
  const baru = !terbaru;

  // Belum ada profil keluarga tersimpan: formulir dikosongkan agar placeholder tampil (sesuai Figma).
  const profilKosong = keluarga.anggota == null;

  const awalProfil = profilKosong
    ? {
        householdId: keluarga.householdId,
        namaRumahTangga: "",
        wilayahDesa: "",
        anggota: "",
        anggotaMhm: "",
        sumberAirUtama: "",
        kapasitasTandonLiter: "",
      }
    : {
        ...keluarga,
        namaRumahTangga:
          keluarga.namaRumahTangga ??
          (terbaru ? `Keluarga ${profile.full_name || "AIRA"}` : ""),
      };

  return (
    <div className="space-y-6">
      <DashboardPageHead
        title="Kondisi Air Rumah Tangga"
        desc="Ringkasan kondisi terkini, riwayat perhitungan, dan profil keluarga yang dipakai AIRA untuk menghitung."
      />

      {/* User Baru: kartu ringkasan tidak ditampilkan. */}
      {terbaru && status && (
        <RingkasanKondisi
          status={status}
          catatan={terbaru}
          keluarga={keluarga}
          tanggalPenuh={tanggal.tanggalPenuh}
          tanggalPanjang={tanggal.tanggalPanjang}
        />
      )}

      <RiwayatPerhitungan riwayat={baris} baru={baru} />

      <ProfilKeluargaForm awal={awalProfil} kosong={profilKosong} />
    </div>
  );
}