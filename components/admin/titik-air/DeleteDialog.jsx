"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

import { Alert } from "@/components/admin/titik-air/PesanUi";
import { tombolGhost } from "@/components/admin/titik-air/titikAirStyles";

// Dialog konfirmasi "Hapus titik air?" (menggantikan window.confirm bawaan browser).
// "Hapus" di sini = nonaktifkan (soft delete): data tidak dihapus permanen.
//
// Props:
//  - nama        : nama titik air yang akan dihapus
//  - memuat      : tampilan sedang memproses ("Menghapus...", tombol nonaktif)
//  - terkunci    : proses SUNGGUHAN sedang berjalan -> dialog tidak boleh ditutup
//  - galat       : pesan galat dari server (jika gagal)
//  - onBatal     : tutup dialog
//  - onKonfirmasi: jalankan penghapusan
export default function DeleteDialog({
  nama,
  memuat = false,
  terkunci = false,
  galat = "",
  onBatal,
  onKonfirmasi,
}) {
  const tombolBatal = useRef(null);
  const onBatalRef = useRef(onBatal);
  const terkunciRef = useRef(terkunci);

  useEffect(() => {
    onBatalRef.current = onBatal;
    terkunciRef.current = terkunci;
  });

  useEffect(() => {
    const pemicu = document.activeElement;
    tombolBatal.current?.focus(); // fokus awal di "Batal" = pilihan paling aman

    const onKey = (e) => {
      if (e.key === "Escape" && !terkunciRef.current) onBatalRef.current();
    };
    window.addEventListener("keydown", onKey);

    const overflowSebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowSebelumnya;
      if (pemicu instanceof HTMLElement) pemicu.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-hidden bg-aira-primary-dark/60 px-6 pt-24 backdrop-blur-sm lg:px-28"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !terkunci) onBatal();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="judul-hapus-titik-air"
        className="w-full max-w-[440px] rounded-[28px] bg-white p-7 shadow-soft"
      >
        <span className="grid size-14 place-items-center rounded-full bg-aira-peach/40 text-[#8a3a22]">
          <Trash2 className="size-6" />
        </span>

        <h2
          id="judul-hapus-titik-air"
          className="mt-5 font-heading text-[22px] font-semibold text-aira-primary"
        >
          Hapus titik air?
        </h2>

        <p className="mt-2 text-base leading-relaxed text-aira-text/80">
          {`Titik air "${nama}" akan dihapus dari daftar aktif (dinonaktifkan), tetapi datanya tidak dihapus permanen.`}
        </p>

        {galat && (
          <div className="mt-4">
            <Alert>{galat}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            ref={tombolBatal}
            type="button"
            onClick={onBatal}
            disabled={memuat}
            className={`${tombolGhost} flex-1 border-2 border-aira-primary`}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onKonfirmasi}
            disabled={memuat}
            className="min-h-[48px] flex-1 rounded-full bg-[#c0392b] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#a53125] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {memuat ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
