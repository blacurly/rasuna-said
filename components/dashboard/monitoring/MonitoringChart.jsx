"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { formatDesimal } from "@/lib/statusDashboard";

const MAKS_HARI = 14;
const TICKS = [0, 3, 7, 14];
const MARGIN = { atas: 10, kanan: 12, kiri: 0, bawah: 30 };
const LEBAR_SUMBU_Y = 34;

const rataRata = (list) => (list.length ? list.reduce((a, d) => a + d.value, 0) / list.length : 0);

// "2 Okt" + "6 Okt" -> "2 - 6 Okt"; beda bulan -> "30 Sep - 6 Okt".
function rentang(list) {
  if (!list.length) return "";
  const [hariA, bulanA] = list[0].date.split(" ");
  const [hariB, bulanB] = list[list.length - 1].date.split(" ");
  return bulanA === bulanB ? `${hariA} - ${hariB} ${bulanB}` : `${hariA} ${bulanA} - ${hariB} ${bulanB}`;
}

// Kurva halus monoton (setara "monotone" pada grafik Figma Make).
function kurvaMonoton(titik) {
  const n = titik.length;
  if (n < 2) return "";
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = titik[i + 1].x - titik[i].x;
    m[i] = (titik[i + 1].y - titik[i].y) / dx[i];
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] =
      m[i - 1] * m[i] <= 0
        ? 0
        : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  }
  let d = `M ${titik[0].x} ${titik[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = titik[i].x + dx[i] / 3;
    const c1y = titik[i].y + (t[i] * dx[i]) / 3;
    const c2x = titik[i + 1].x - dx[i] / 3;
    const c2y = titik[i + 1].y - (t[i + 1] * dx[i]) / 3;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${titik[i + 1].x} ${titik[i + 1].y}`;
  }
  return d;
}

// Kartu "Tren ketahanan air (hari)" sesuai Figma Make. `data` = [{ id, date, value, liter }], lama ke baru.
export default function MonitoringChart({ data, kebutuhanHarian, kondisiSumberAir }) {
  const wadah = useRef(null);
  const [lebar, setLebar] = useState(640);
  const [aktif, setAktif] = useState(null);

  useEffect(() => {
    const el = wadah.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const pengamat = new ResizeObserver(([entri]) => setLebar(Math.max(240, Math.round(entri.contentRect.width))));
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, []);

  const tinggi = lebar < 640 ? 240 : 280;
  const kiriPlot = MARGIN.kiri + LEBAR_SUMBU_Y;
  const kananPlot = lebar - MARGIN.kanan;
  const atasPlot = MARGIN.atas;
  const bawahPlot = tinggi - MARGIN.bawah;
  const yDari = (hari) => bawahPlot - (Math.min(Math.max(hari, 0), MAKS_HARI) / MAKS_HARI) * (bawahPlot - atasPlot);

  const awalX = kiriPlot + 16;
  const akhirX = kananPlot - 8;
  const titik = data.map((d, i) => ({
    ...d,
    x: data.length === 1 ? (awalX + akhirX) / 2 : awalX + (i / (data.length - 1)) * (akhirX - awalX),
    y: yDari(d.value),
  }));

  const garis = kurvaMonoton(titik);
  const area = garis ? `${garis} L ${titik[titik.length - 1].x} ${bawahPlot} L ${titik[0].x} ${bawahPlot} Z` : "";

  const separuh = Math.floor(data.length / 2);
  const awal = data.slice(0, separuh);
  const akhir = data.slice(separuh);
  const rataAwal = rataRata(awal);
  const rataAkhir = rataRata(akhir);
  const selisih = rataAkhir - rataAwal;
  const naik = selisih >= 0;

  const batasKondisi =
    kondisiSumberAir === "Terbatas"
      ? " Karena kondisi sumber terakhir terbatas, status akhir tidak dapat melebihi Waspada sampai kondisi sumber kembali normal."
      : kondisiSumberAir === "Tidak berfungsi"
        ? " Karena kondisi sumber terakhir tidak berfungsi, status akhir adalah Mode Krisis sampai kondisi sumber kembali normal."
        : "";

  return (
    <section className="rounded-[28px] border border-aira-primary/5 bg-white p-6 shadow-soft sm:p-8">
      <h2 className="text-xl font-semibold text-aira-primary">Tren ketahanan air (hari)</h2>

      <div ref={wadah} className="relative mt-4 h-[240px] sm:h-[280px]">
        <svg
          width={lebar}
          height={tinggi}
          viewBox={`0 0 ${lebar} ${tinggi}`}
          className="block overflow-visible"
          role="img"
          aria-label="Grafik tren ketahanan air berdasarkan catatan pemantauan"
        >
          <defs>
            <linearGradient id="isiGrafikMonitoring" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#176B78" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#176B78" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {TICKS.map((v) => (
            <g key={v}>
              <line x1={kiriPlot} x2={kananPlot} y1={yDari(v)} y2={yDari(v)} stroke="#176B78" strokeOpacity="0.1" />
              <text x={LEBAR_SUMBU_Y - 8} y={yDari(v) + 4} textAnchor="end" fontSize="12" fill="#26363B">
                {v}
              </text>
            </g>
          ))}

          <line x1={kiriPlot} x2={kananPlot} y1={yDari(3)} y2={yDari(3)} stroke="#d4573a" strokeDasharray="5 4" />
          <text x={kananPlot - 4} y={yDari(3) + 14} textAnchor="end" fontSize="11" fill="#b4563c">
            Krisis
          </text>
          <line x1={kiriPlot} x2={kananPlot} y1={yDari(7)} y2={yDari(7)} stroke="#176B78" strokeDasharray="5 4" />
          <text x={kananPlot - 4} y={yDari(7) + 14} textAnchor="end" fontSize="11" fill="#176B78">
            Aman
          </text>

          {area && <path d={area} fill="url(#isiGrafikMonitoring)" />}
          {garis && <path d={garis} fill="none" stroke="#176B78" strokeWidth="3" />}

          {titik.map((p) => (
            <g key={p.id}>
              <text x={p.x} y={tinggi - 8} textAnchor="middle" fontSize="12" fill="#26363B">
                {p.date}
              </text>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#176B78"
                stroke="#fff"
                strokeWidth="2"
                onMouseEnter={() => setAktif(p.id)}
                onMouseLeave={() => setAktif(null)}
              >
                <title>{`${p.date}: ${formatDesimal(p.value)} hari (${Number(p.liter).toLocaleString("id-ID")} L)`}</title>
              </circle>
            </g>
          ))}
        </svg>

        {titik
          .filter((p) => p.id === aktif)
          .map((p) => (
            <div
              key={p.id}
              role="status"
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-2xl border border-aira-primary/20 bg-white px-3 py-2 text-xs shadow-soft"
              style={{ left: Math.min(Math.max(p.x, 70), lebar - 70), top: p.y - 10 }}
            >
              Ketahanan: {formatDesimal(p.value)} hari ({Number(p.liter).toLocaleString("id-ID")} L)
            </div>
          ))}
      </div>

      {data.length < 2 ? (
        <p className="mt-5 rounded-2xl bg-aira-bg p-4 text-sm text-aira-text/75">
          Perlu minimal 2 catatan untuk perbandingan
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-aira-bg p-4">
              <p className="text-xs text-aira-text/60">{rentang(awal)} (rata-rata)</p>
              <p className="font-heading text-2xl font-bold text-aira-primary">{formatDesimal(rataAwal)} hari</p>
            </div>
            <div className="rounded-2xl bg-aira-bg p-4">
              <p className="text-xs text-aira-text/60">{rentang(akhir)} (rata-rata)</p>
              <p className="font-heading text-2xl font-bold text-aira-primary">{formatDesimal(rataAkhir)} hari</p>
            </div>
            <div className={`rounded-2xl p-4 ${naik ? "bg-aira-sage/40" : "bg-aira-peach/30"}`}>
              <p className="text-xs text-aira-text/70">Perubahan</p>
              <p className="flex items-center gap-2 font-heading text-2xl font-bold text-aira-primary">
                {naik ? <TrendingUp className="size-6" /> : <TrendingDown className="size-6" />} {naik ? "+" : ""}
                {formatDesimal(selisih)} hari
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-aira-text/60">Rentang catatan dibagi dua: paruh awal dan paruh akhir.</p>
        </>
      )}

      <p className="mt-4 text-sm text-aira-text/70">
        Estimasi memakai kebutuhan {kebutuhanHarian} liter per hari.{batasKondisi}
      </p>
    </section>
  );
}
