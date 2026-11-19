"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Info, Plus, X } from "lucide-react";

import DashboardPageHead from "@/components/dashboard/DashboardPageHead";
import MonitoringChart from "@/components/dashboard/monitoring/MonitoringChart";
import UpdateWaterForm from "@/components/dashboard/monitoring/UpdateWaterForm";
import { catatKondisiAir } from "@/app/actions/dashboard";
import { simpanDraftKalkulator } from "@/lib/hasilKalkulator";
import { formatDesimal, hitungStatusDashboard } from "@/lib/statusDashboard";

const tombolUtama =
  "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-aira-primary px-6 py-3.5 font-semibold text-white shadow-soft transition-colors hover:bg-aira-primary-dark sm:w-auto";

// B03 - Monitoring Kondisi Air. Dua versi: User Baru (`adaData` false) dan User Lama (`adaData` true).
export default function MonitoringClient({
  adaData = false,
  volume = 0,
  liters = 0,
  lastUpdate = "",
  chartData = [],
  daftarCatatan = [],
  totalCatatan = 0,
  draftKalkulator = null,
  kebutuhanHarian = 0,
  anggota = 1,
  anggotaMhm = 0,
  kondisiSumberAir = "Belum diketahui",
  tankCapacity = 0,
  parameter = "",
}) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState("");

  // Status memakai klasifikasi yang sama dengan kalkulator dan dashboard.
  const status = adaData
    ? hitungStatusDashboard({ liter: liters, anggota, anggotaMhm, kondisiSumberAir })
    : null;

  async function handleSave(data) {
    if (menyimpan) return;

    setMenyimpan(true);
    setGalat("");

    const hasil = await catatKondisiAir({ volume: data.volume, note: data.note });

    setMenyimpan(false);

    if (!hasil?.ok) {
      setGalat(hasil?.error || "Catatan belum dapat disimpan.");
      return;
    }

    setIsFormOpen(false);
    router.refresh();
  }

  // "Buka kalkulator dengan data ini": isi draft Kalkulator dengan parameter terakhir.
  function bukaKalkulator() {
    if (draftKalkulator) simpanDraftKalkulator(draftKalkulator);
    router.push("/kalkulator-air");
  }

  const aksi = adaData ? (
    <button type="button" onClick={() => setIsFormOpen((sebelumnya) => !sebelumnya)} className={tombolUtama}>
      {isFormOpen ? <X className="size-5" /> : <Plus className="size-5" />} Perbarui Kondisi Air Saat Ini
    </button>
  ) : (
    <Link href="/kalkulator-air" className={tombolUtama}>
      <Plus className="size-5" /> Mulai Catat Kondisi Air
    </Link>
  );

  return (
    <div className="space-y-6">
      <DashboardPageHead
        title="Monitoring Kondisi Air"
        desc="Tren stok air dari catatan yang Anda masukkan sendiri."
        action={aksi}
      />

      {adaData && status && (
        <section
          className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-aira-primary/10 bg-white p-4 shadow-soft"
          aria-label="Kondisi terakhir"
        >
          <span className="text-sm font-semibold text-aira-primary">Kondisi terakhir</span>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.tampilan.chip}`}>
            {status.tampilan.label}
          </span>
          <span className="text-sm text-aira-text/80">
            <b className="font-heading text-lg text-aira-primary">{formatDesimal(status.hari)} hari</b> estimasi
            ketahanan
          </span>
          <span className="text-sm text-aira-text/65">Diperbarui {lastUpdate}</span>
        </section>
      )}

      <div className="flex gap-3 rounded-2xl border border-aira-secondary/30 bg-white/70 p-4 text-sm text-aira-text/80">
        <Info className="mt-0.5 size-5 shrink-0 text-aira-secondary" />
        <p>
          Data di halaman ini berasal dari catatan manual Anda, bukan sensor atau pemantauan waktu nyata. Semakin
          rutin dicatat, semakin akurat tren yang tampil.
        </p>
      </div>

      {adaData && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-aira-sage bg-aira-sage/20 p-5 sm:p-6">
          <div className="min-w-[260px] flex-1">
            <h2 className="text-lg font-semibold text-aira-primary">Parameter perhitungan terakhir</h2>
            <p className="mt-1 text-sm text-aira-text/80">{parameter}</p>
          </div>
          <button
            type="button"
            onClick={bukaKalkulator}
            className="min-h-[48px] w-full rounded-full bg-aira-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-aira-primary-dark sm:w-auto"
          >
            Buka kalkulator dengan data ini
          </button>
        </section>
      )}

      {adaData && isFormOpen && (
        <>
          {galat && (
            <p role="alert" className="rounded-2xl bg-aira-peach/30 px-4 py-3 text-sm text-aira-danger-dark">
              {galat}
            </p>
          )}

          <UpdateWaterForm
            initialVolume={volume}
            tankCapacity={tankCapacity}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
          />
        </>
      )}

      {adaData ? (
        <>
          <MonitoringChart data={chartData} kebutuhanHarian={kebutuhanHarian} kondisiSumberAir={kondisiSumberAir} />

          <section className="rounded-[28px] border border-aira-primary/5 bg-white p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-semibold text-aira-primary">Catatan Anda</h2>
            <ul className="mt-4 divide-y divide-aira-primary/10">
              {daftarCatatan.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-4">
                  <div className="w-36">
                    <p className="font-semibold">{c.tanggal}</p>
                    <p className="text-xs text-aira-text/60">{c.waktu} WIB</p>
                  </div>
                  <div className="min-w-0 flex-1 basis-full sm:min-w-[180px] sm:basis-auto">
                    <p className="text-[15px] leading-normal">{c.catatan}</p>
                    <p className="text-sm text-aira-text/65">
                      {Number(c.liter).toLocaleString("id-ID")} L ({formatDesimal(c.hari)} hari)
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${c.statusChip}`}>
                    {c.statusLabel}
                  </span>
                </li>
              ))}
            </ul>
            {totalCatatan > daftarCatatan.length && (
              <p className="mt-4 text-xs text-aira-text/60">
                Menampilkan {daftarCatatan.length} dari {totalCatatan} catatan terbaru.
              </p>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="rounded-[28px] border border-aira-primary/5 bg-white p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-semibold text-aira-primary">Tren ketahanan air (hari)</h2>
            <div className="flex flex-col items-center px-2 py-10 text-center sm:py-14">
              <span className="grid size-16 place-items-center rounded-full bg-aira-sage/35 text-aira-primary">
                <Activity className="size-7" />
              </span>
              <p className="mt-4 text-lg font-semibold leading-normal text-aira-primary">Belum ada data monitoring</p>
              <p className="mt-2 max-w-[420px] leading-normal text-aira-text/70">
                Tren ketahanan air akan muncul di sini setelah Anda mencatat kondisi air pertama melalui Kalkulator.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-aira-primary/5 bg-white p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-semibold text-aira-primary">Catatan Anda</h2>
            <p className="mt-1 text-sm text-aira-text/70">Belum ada catatan kondisi air.</p>
          </section>
        </>
      )}
    </div>
  );
}
