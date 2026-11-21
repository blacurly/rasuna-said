"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, StickyNote, Trash2, X } from "lucide-react";

import { inputCls } from "@/components/dashboard/DashboardFormUi";

import "./dialog-dashboard.css";

export const BATAS_CATATAN = 2000;

const tombolGarisCls =
  "min-h-[48px] rounded-full border-2 border-aira-primary px-6 text-base font-semibold text-aira-primary transition-colors hover:bg-aira-primary/10 disabled:cursor-not-allowed disabled:opacity-50";
const tombolSolidCls =
  "min-h-[48px] rounded-full bg-aira-primary px-6 text-base font-semibold text-white transition-colors hover:bg-aira-primary-dark disabled:cursor-not-allowed disabled:opacity-60";
const tombolBahayaCls =
  "min-h-[48px] rounded-full bg-[#b5402a] px-6 text-base font-semibold text-white transition-colors hover:bg-[#9c3522] disabled:cursor-not-allowed disabled:opacity-60";

// Lapisan pop-up yang menempel pada layar yang sedang terlihat (portal ke body, bukan ke halaman).
// Posisi vertikal murni dari flex: ruang kosong di atas kartu (maksimal 210px, sekitar 5,5 cm)
// dan di bawah kartu dibagi sama, jadi kartu berada di tengah persis pada layar pendek dan
// sedikit di atas tengah pada layar tinggi. Scroll halaman dikunci selama pop-up terbuka.
function Lapisan({ onTutup, terkunci = false, children }) {
  const onTutupRef = useRef(onTutup);
  const terkunciRef = useRef(terkunci);

  useEffect(() => {
    onTutupRef.current = onTutup;
    terkunciRef.current = terkunci;
  });

  useEffect(() => {
    const pemicu = document.activeElement;

    const onKey = (e) => {
      if (e.key === "Escape" && !terkunciRef.current) onTutupRef.current();
    };
    window.addEventListener("keydown", onKey);

    const akar = document.documentElement;
    const bodySebelumnya = document.body.style.overflow;
    const akarSebelumnya = akar.style.overflow;
    document.body.style.overflow = "hidden";
    akar.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = bodySebelumnya;
      akar.style.overflow = akarSebelumnya;
      // Kembalikan fokus ke tombol pemicu (penting untuk pengguna keyboard).
      if (pemicu instanceof HTMLElement) pemicu.focus();
    };
  }, []);

  const tutupDariLatar = () => {
    if (!terkunciRef.current) onTutupRef.current();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex h-[100dvh] flex-col items-center overflow-hidden bg-aira-primary-dark/60 px-6 py-12 backdrop-blur-[4px] lg:px-28"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) tutupDariLatar();
      }}
    >
      <div className="max-h-[210px] min-h-0 w-full flex-[1_1_0px]" aria-hidden="true" onMouseDown={tutupDariLatar} />
      {children}
      <div className="min-h-0 w-full flex-[1_1_0px]" aria-hidden="true" onMouseDown={tutupDariLatar} />
    </div>,
    document.body,
  );
}

// Pop-up "Catatan asesmen". `awal` = isi catatan saat ini. `onSimpan(teks)` dijalankan oleh induk
// (memanggil API), `memuat` = sedang menyimpan, `galat` = pesan galat dari server.
export function DialogCatatan({ awal = "", memuat = false, galat = "", onBatal, onSimpan }) {
  const [teks, setTeks] = useState(awal);
  const fokus = useRef(null);
  const berlebih = teks.length > BATAS_CATATAN;

  useEffect(() => {
    fokus.current?.focus();
  }, []);

  return (
    <Lapisan onTutup={onBatal} terkunci={memuat}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-catatan-asesmen"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!memuat && !berlebih) onSimpan(teks);
        }}
        className="dialog-dashboard-masuk flex max-h-[calc(100dvh-96px)] min-h-0 w-full max-w-[560px] shrink flex-col rounded-[28px] bg-white shadow-soft"
      >
        <div className="flex items-center justify-between gap-4 border-b border-aira-primary/10 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-aira-sage/50 text-aira-primary-dark">
              <StickyNote className="size-5" />
            </span>
            <h2 id="judul-catatan-asesmen" className="font-heading text-xl font-semibold text-aira-primary">
              Catatan asesmen
            </h2>
          </div>
          <button
            type="button"
            onClick={onBatal}
            disabled={memuat}
            aria-label="Tutup"
            className="grid size-11 place-items-center rounded-full text-aira-text/70 hover:bg-aira-primary/10 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
          <label className="block">
            <span className="mb-2 block text-[15px] font-semibold">Catatan asesmen (maksimal 2.000 karakter)</span>
            <textarea
              ref={fokus}
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              rows={6}
              disabled={memuat}
              className={`${inputCls} text-base`}
            />
          </label>
          <p className={`mt-1 text-right text-sm ${berlebih ? "font-semibold text-[#b5402a]" : "text-aira-text/60"}`}>
            {teks.length.toLocaleString("id-ID")} / 2.000
          </p>
          {galat && (
            <p role="alert" className="mt-2 flex items-center gap-2 text-base font-medium text-aira-danger-dark">
              <AlertCircle className="size-5 shrink-0" /> {galat}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-aira-primary/10 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={onBatal} disabled={memuat} className={tombolGarisCls}>
            Batal
          </button>
          <button
            type="submit"
            disabled={memuat || berlebih}
            className={`${tombolSolidCls} inline-flex items-center justify-center gap-2`}
          >
            {memuat && <Loader2 className="size-4 animate-spin" />} {memuat ? "Menyimpan..." : "Simpan Catatan"}
          </button>
        </div>
      </form>
    </Lapisan>
  );
}

// Dialog konfirmasi hapus (menggantikan window.confirm). Bila `galat` terisi, hanya tombol "Tutup" tampil.
export function DialogKonfirmasi({ judul, isi, memuat = false, galat = "", onBatal, onKonfirmasi }) {
  const fokus = useRef(null);

  useEffect(() => {
    fokus.current?.focus(); // fokus awal di "Batal" = pilihan paling aman
  }, []);

  return (
    <Lapisan onTutup={onBatal} terkunci={memuat}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="judul-konfirmasi-hapus"
        className="dialog-dashboard-masuk max-h-[calc(100dvh-96px)] min-h-0 w-full max-w-[440px] shrink overflow-y-auto rounded-[28px] bg-white p-7 shadow-soft"
      >
        <span className="grid size-14 place-items-center rounded-full bg-aira-peach/40 text-[#8a3a22]">
          <Trash2 className="size-6" />
        </span>
        <h2 id="judul-konfirmasi-hapus" className="mt-5 font-heading text-[22px] font-semibold text-aira-primary">
          {judul}
        </h2>
        <p className="mt-2 text-base leading-relaxed text-aira-text/80">{isi}</p>

        {galat && (
          <p
            role="alert"
            className="mt-4 flex gap-2 rounded-2xl bg-aira-peach/25 p-3 text-base font-medium text-[#8a3a22]"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0" /> {galat}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          {galat ? (
            <button ref={fokus} type="button" onClick={onBatal} className={`${tombolGarisCls} flex-1`}>
              Tutup
            </button>
          ) : (
            <>
              <button
                ref={fokus}
                type="button"
                onClick={onBatal}
                disabled={memuat}
                className={`${tombolGarisCls} flex-1`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onKonfirmasi}
                disabled={memuat}
                className={`${tombolBahayaCls} flex flex-1 items-center justify-center gap-2`}
              >
                {memuat && <Loader2 className="size-4 animate-spin" />} {memuat ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </>
          )}
        </div>
      </div>
    </Lapisan>
  );
}
