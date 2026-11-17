import DashboardPageHead from "@/components/dashboard/DashboardPageHead";
import ProfilKeluargaForm from "@/components/dashboard/kondisi-air/ProfilKeluargaForm";
import RingkasanKondisi from "@/components/dashboard/kondisi-air/RingkasanKondisi";
import RiwayatPerhitungan from "@/components/dashboard/kondisi-air/RiwayatPerhitungan";

import { ambilProfilDashboard } from "@/lib/dashboardProfile";
import { hitungStatusDashboard } from "@/lib/statusDashboard";
import { formatTanggalIso } from "@/lib/waktuDashboard";

import { ambilDataDashboard, tanggalIsoWib, waktuWib } from "@/services/dashboardService";
import { ambilRiwayatKalkulator } from "@/app/actions/riwayat";

export const metadata = {
  title: "Kondisi Air Rumah Tangga - AIRA",
};

// B02 - Kondisi Air Rumah Tangga: ringkasan, riwayat perhitungan, dan profil keluarga.
// Dua versi: User Baru (belum ada catatan) dan User Lama (sudah ada catatan).
export default async function KondisiAirRumahTanggaPage() {
  const profile = await ambilProfilDashboard();

  // Data keluarga dan catatan ringkasan tetap menggunakan sumber sebelumnya.
  const {
    keluarga,
    catatan,
  } = await ambilDataDashboard();

  // Ambil riwayat kalkulator dari Supabase berdasarkan pengguna yang login.
  const hasilRiwayat = await ambilRiwayatKalkulator();

  const dataRiwayat = hasilRiwayat.ok
    ? hasilRiwayat.data
    : [];

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

  // Ubah data database menjadi format yang dibutuhkan RiwayatPerhitungan.
  const baris = dataRiwayat.map((r) => {
    const snapshot = r.input_snapshot ?? {};
    const masukan = snapshot.input ?? {};

    const anggota = Number(masukan.anggota ?? 0);
    const anggotaMhm = masukan.mhm
      ? Number(masukan.anggotaMhm ?? 0)
      : 0;

    const kondisiSumberAir =
      r.water_condition || masukan.kondisi || "Belum diketahui";

    const liter = Number(r.available_water_liters ?? 0);

    // assessed_at berupa timestamp lengkap: ambil tanggal dan jam dalam zona WIB.
    const tanggalRiwayat = formatTanggalIso(tanggalIsoWib(r.assessed_at));

    return {
      id: r.assessment_id,

      tanggalPenuh: tanggalRiwayat.tanggalPenuh,
      waktu: waktuWib(r.assessed_at),

      lokasi: masukan.lokasi || "",
      sumberAir: masukan.sumberAir || "",

      kondisiSumberAir,

      anggota,
      anggotaMhm,
      luasAtap: masukan.luasAtap
        ? Number(masukan.luasAtap)
        : 0,

      liter,

      kapasitasTandonLiter: Number(masukan.kapasitas ?? 0),

      status: hitungStatusDashboard({
        liter,
        anggota,
        anggotaMhm,
        kondisiSumberAir,
      }),
    };
  });

  // User Baru: belum ada catatan kondisi air (B02 versi User Baru).
  const baru = !terbaru;

  // Belum ada profil keluarga tersimpan: formulir dikosongkan agar placeholder tampil (sesuai Figma).
  const profilKosong = keluarga.anggota == null;

  const awalProfil = profilKosong
    ? {
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
