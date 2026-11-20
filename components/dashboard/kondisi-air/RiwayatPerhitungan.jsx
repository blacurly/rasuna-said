"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator, Trash2 } from "lucide-react";

import { BATAS_CATATAN, DialogCatatan, DialogKonfirmasi } from "@/components/dashboard/kondisi-air/DialogDashboard";
import { simpanDraftKalkulator } from "@/lib/hasilKalkulator";
import { formatDesimal } from "@/lib/statusDashboard";

// Penulisan kondisi sumber air pada tampilan Kalkulator.
const KONDISI_TAMPILAN = { "Tidak berfungsi": "Tidak Berfungsi" };
const kondisiTampilan = (kondisi) => KONDISI_TAMPILAN[kondisi] ?? kondisi;

const formatLiter = (angka) => Number(angka).toLocaleString("id-ID");

const teksMasukan = (r) =>
  `${r.anggota} anggota · atap ${r.luasAtap ? `${r.luasAtap} m²` : "—"} · MHM ${r.anggotaMhm ? `${r.anggotaMhm} orang` : "—"}`;

const labelStatus = (status) => status.tampilan.label.split(" / ")[0];

// Tombol aksi pada baris riwayat (ukuran sama, tersusun vertikal di tabel).
const tombolBaris =
  "h-9 w-[128px] rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors disabled:opacity-50";
const tombolBarisGaris = `${tombolBaris} border-aira-primary/40 text-aira-primary hover:bg-aira-primary/10`;
const tombolBarisHapus = `${tombolBaris} inline-flex items-center justify-center gap-1.5 border-aira-peach text-[#8a3a22] hover:bg-aira-peach/25`;

// `riwayat`: [{ ...catatan perhitungan, tanggalPenuh, status }] (status = hasil hitungStatusDashboard).
// `baru` = User Baru (belum ada catatan): hanya judul dan keterangan, tanpa kotak kosong.
export default function RiwayatPerhitungan({ riwayat, baru = false }) {
  const router = useRouter();
  const [catatanUntuk, setCatatanUntuk] = useState(null);
  const [hapusUntuk, setHapusUntuk] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function bukaCatatan(r) {
    setGalat("");
    setCatatanUntuk(r);
  }

  function bukaHapus(r) {
    setGalat("");
    setHapusUntuk(r);
  }

  function tutupDialog() {
    if (memuat) return;
    setCatatanUntuk(null);
    setHapusUntuk(null);
    setGalat("");
  }

  async function simpanCatatan(nilai) {
    if (!catatanUntuk || memuat) return;
    if (nilai.length > BATAS_CATATAN) {
      setGalat("Catatan maksimal 2.000 karakter.");
      return;
    }
    setGalat("");
    setMemuat(true);
    const response = await fetch(`/api/water-assessments/${catatanUntuk.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessment_notes: nilai }),
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    setMemuat(false);
    if (!response?.ok || !result?.success) {
      setGalat(result?.message || "Catatan asesmen belum dapat diperbarui.");
      return;
    }
    setCatatanUntuk(null);
    setToast("Catatan tersimpan");
    router.refresh();
  }

  async function hapusRiwayat() {
    if (!hapusUntuk || memuat) return;
    setGalat("");
    setMemuat(true);
    const response = await fetch(`/api/water-assessments/${hapusUntuk.id}`, {
      method: "DELETE",
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    setMemuat(false);
    if (!response?.ok || !result?.success) {
      setGalat(
        result?.message ||
          "Riwayat belum dapat dihapus. Coba muat ulang halaman atau hubungi pengelola jika masalah berlanjut.",
      );
      return;
    }
    setHapusUntuk(null);
    setToast("Riwayat perhitungan dihapus");
    router.refresh();
  }

  // "Hitung ulang": isi draft Kalkulator dengan data perhitungan ini, lalu buka Kalkulator.
  function hitungUlang(r) {
    const persen = Math.min(100, Math.round((r.liter / r.kapasitasTandonLiter) * 20) * 5);

    simpanDraftKalkulator({
      lokasi: r.lokasi,
      anggota: r.anggota,
      sumberAir: r.sumberAir,
      kondisi: kondisiTampilan(r.kondisiSumberAir),
      kapasitas: String(r.kapasitasTandonLiter),
      persen,
      mhm: r.anggotaMhm > 0,
      anggotaMhm: r.anggotaMhm,
      luasAtap: r.luasAtap ? String(r.luasAtap) : "",
    });
    router.push("/kalkulator-air");
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[28px] border border-aira-primary/5 bg-white p-6 shadow-soft sm:p-8">
      <h2 className="text-[22px] font-semibold text-aira-primary">Riwayat perhitungan</h2>
      <p className="mt-1 text-base text-aira-text/70">
        {baru
          ? "Belum ada riwayat pengisian kalkulator"
          : 'Pilih "Hitung ulang" untuk membuka kalkulator dengan data yang sudah terisi.'}
      </p>

      {toast && (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 z-[1100] -translate-x-1/2 rounded-full bg-aira-primary-dark px-6 py-3 text-base font-medium text-white shadow-soft"
        >
          {toast}
        </p>
      )}

      {baru ? null : riwayat.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-aira-bg p-8 text-center">
          <p className="font-semibold text-aira-primary">Belum ada riwayat perhitungan</p>
          <Link
            href="/kalkulator-air"
            className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-aira-primary px-6 py-3 font-semibold text-white hover:bg-aira-primary-dark"
          >
            <Calculator className="size-4" /> Hitung kondisi air
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-aira-primary/10 lg:block">
            <table className="w-full table-fixed text-left text-[15px]" aria-label="Riwayat perhitungan ketahanan air">
              <caption className="sr-only">Riwayat data dan hasil perhitungan ketahanan air rumah tangga</caption>
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[18%]" />
                <col className="w-[19%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[160px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-aira-primary/10 bg-aira-text/5 align-bottom text-xs uppercase tracking-wider text-aira-text/60">
                  {["Tanggal", "Lokasi", "Masukan", "Volume", "Ketahanan", "Status"].map((h) => (
                    <th key={h} className="px-3 py-3.5 font-semibold">
                      {h}
                    </th>
                  ))}
                  <th className="px-3 py-3.5">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id} className="border-b border-aira-primary/5 last:border-0 hover:bg-aira-sage/10">
                    <td className="px-3 py-5 align-top">
                      <span className="font-semibold">{r.tanggalPenuh}</span>
                      {r.waktu && <span className="block text-sm text-aira-text/60">{r.waktu}</span>}
                    </td>
                    <td className="break-words px-3 py-5 align-top">
                      {r.lokasi || <span className="text-aira-text/50">Tidak diisi</span>}
                      <span className="block text-sm text-aira-text/60">
                        Sumber: {kondisiTampilan(r.kondisiSumberAir)}
                      </span>
                    </td>
                    <td className="break-words px-3 py-5 align-top text-aira-text/80">{teksMasukan(r)}</td>
                    <td className="whitespace-nowrap px-3 py-5 align-top">
                      {formatLiter(r.liter)} L
                      <span className="block text-sm text-aira-text/60">{r.status.kebutuhanHarian} L/hari</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-5 align-top font-semibold text-aira-primary">
                      {formatDesimal(r.status.hari)} hari
                    </td>
                    <td className="px-3 py-5 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${r.status.tampilan.chip}`}
                      >
                        {labelStatus(r.status)}
                      </span>
                    </td>
                    <td className="px-3 py-5 align-top">
                      <div className="flex flex-col items-end gap-2">
                        <button type="button" onClick={() => bukaCatatan(r)} className={tombolBarisGaris}>
                          Catatan
                        </button>
                        <button type="button" onClick={() => hitungUlang(r)} className={tombolBarisGaris}>
                          Hitung ulang
                        </button>
                        <button
                          type="button"
                          onClick={() => bukaHapus(r)}
                          aria-label={`Hapus riwayat ${r.tanggalPenuh}`}
                          className={tombolBarisHapus}
                        >
                          <Trash2 className="size-4" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-5 space-y-3 lg:hidden" aria-label="Riwayat perhitungan ketahanan air">
            {riwayat.map((r) => (
              <li key={r.id} className="rounded-2xl border border-aira-primary/10 bg-aira-bg/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.tanggalPenuh}</p>
                    {r.waktu && <p className="text-sm text-aira-text/60">{r.waktu}</p>}
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${r.status.tampilan.chip}`}
                  >
                    {labelStatus(r.status)}
                  </span>
                </div>

                <dl className="mt-3 space-y-2 text-[15px]">
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <dt className="text-aira-text/60">Lokasi</dt>
                    <dd>
                      {r.lokasi || <span className="text-aira-text/50">Tidak diisi</span>}
                      <span className="block text-sm text-aira-text/60">
                        Sumber: {kondisiTampilan(r.kondisiSumberAir)}
                      </span>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <dt className="text-aira-text/60">Masukan</dt>
                    <dd>{teksMasukan(r)}</dd>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <dt className="text-aira-text/60">Volume</dt>
                    <dd>
                      {formatLiter(r.liter)} L · {r.status.kebutuhanHarian} L/hari
                    </dd>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <dt className="text-aira-text/60">Ketahanan</dt>
                    <dd className="font-semibold text-aira-primary">{formatDesimal(r.status.hari)} hari</dd>
                  </div>
                </dl>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => bukaCatatan(r)}
                    className="h-10 flex-1 rounded-full border-[1.5px] border-aira-primary/40 text-sm font-semibold text-aira-primary hover:bg-aira-primary/10"
                  >
                    Catatan
                  </button>
                  <button
                    type="button"
                    onClick={() => hitungUlang(r)}
                    className="h-10 flex-1 rounded-full border-[1.5px] border-aira-primary/40 text-sm font-semibold text-aira-primary hover:bg-aira-primary/10"
                  >
                    Hitung ulang
                  </button>
                  <button
                    type="button"
                    onClick={() => bukaHapus(r)}
                    aria-label={`Hapus riwayat ${r.tanggalPenuh}`}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-aira-peach text-sm font-semibold text-[#8a3a22] hover:bg-aira-peach/25"
                  >
                    <Trash2 className="size-4" /> Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {catatanUntuk && (
        <DialogCatatan
          key={catatanUntuk.id}
          awal={catatanUntuk.catatanAsesmen || ""}
          memuat={memuat}
          galat={galat}
          onBatal={tutupDialog}
          onSimpan={simpanCatatan}
        />
      )}
      {hapusUntuk && (
        <DialogKonfirmasi
          judul="Hapus riwayat perhitungan?"
          isi="Hapus riwayat perhitungan ini secara permanen? Rekomendasi dan interaksi Assistant yang terhubung langsung ke asesmen ini juga akan dihapus. Data profil keluarga tidak akan dihapus."
          memuat={memuat}
          galat={galat}
          onBatal={tutupDialog}
          onKonfirmasi={hapusRiwayat}
        />
      )}
    </section>
  );
}
