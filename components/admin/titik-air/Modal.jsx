"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Modal terpusat (di HP berubah menjadi "bottom sheet"), sesuai Figma Make.
// Menggantikan Overlay panel-kanan yang lama.
//
// Props:
//  - title    : judul modal
//  - onClose  : dipanggil saat X / Esc / klik latar gelap
//  - locked   : true saat proses simpan sedang berjalan -> modal tidak boleh ditutup
//  - footer   : isi bagian bawah (tombol Batal / Simpan)
//  - onSubmit : dipanggil saat form disubmit (Enter atau tombol submit)
export default function Modal({
  title,
  onClose,
  locked = false,
  children,
  footer,
  onSubmit,
}) {
  const dialog = useRef(null);

  // Simpan versi terbaru onClose & locked di ref. Dengan begitu efek di bawah
  // cukup berjalan SEKALI (saat modal muncul), walaupun induknya render ulang.
  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);

  useEffect(() => {
    onCloseRef.current = onClose;
    lockedRef.current = locked;
  });

  useEffect(() => {
    const pemicu = document.activeElement; // tombol yang membuka modal
    dialog.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && !lockedRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);

    // Kunci scroll halaman selama modal terbuka.
    const overflowSebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowSebelumnya;
      // Kembalikan fokus ke tombol pemicu (penting untuk pengguna keyboard).
      if (pemicu instanceof HTMLElement) pemicu.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center overflow-hidden bg-aira-primary-dark/60 pt-4 backdrop-blur-sm sm:items-start sm:p-8 lg:p-16"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
    >
      <form
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex max-h-full w-full max-w-[672px] flex-col rounded-t-[28px] bg-white shadow-soft outline-none sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-aira-primary/10 px-5 py-4 sm:px-8 sm:py-5">
          <h2 className="font-heading text-2xl font-semibold text-aira-primary">
            {title}
          </h2>

          <button
            type="button"
            disabled={locked}
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-11 place-items-center rounded-full text-aira-text/70 hover:bg-aira-primary/10 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
          {children}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-aira-primary/10 px-5 py-4 sm:px-8">
          {footer}
        </div>
      </form>
    </div>,
    document.body
  );
}
