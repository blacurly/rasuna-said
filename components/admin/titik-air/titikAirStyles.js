// Kelas Tailwind bersama untuk halaman C03 - Kelola Titik Air.
// Sumber: Figma Make (AdminManage.tsx). Nama warna Figma dipetakan ke token AIRA:
//   ocean -> aira-primary | ocean-dark -> aira-primary-dark | ice -> aira-bg
//   charcoal -> aira-text | sage -> aira-sage | peach -> aira-peach | sand -> aira-sand
//
// PENTING (kenapa radius ditulis dalam piksel, bukan rounded-2xl / rounded-xl):
// globals.css repo ini memakai tema shadcn yang MENIMPA skala radius Tailwind.
// Di repo: rounded-xl = 14px dan rounded-2xl = 18px. Di Figma Make: 12px dan 16px.
// Supaya tampilan sama persis dengan Figma, C03 memakai nilai piksel eksplisit.

/** Kartu putih besar yang membungkus pencarian + tabel. */
export const kartuUtama =
  "rounded-[28px] border border-aira-primary/10 bg-white p-6 shadow-[0_5px_20px_rgba(23,107,120,0.08)] sm:p-8";

/** Kolom isian (input / select / textarea) di halaman dan modal. */
export const kolomForm =
  "w-full min-h-[52px] rounded-[16px] border border-aira-primary/20 bg-white px-4 py-3.5 text-base transition-colors focus:border-aira-primary focus:outline-none";

/** Tambahan kelas saat kolom salah (border merah). Tanda ! di akhir = !important (sintaks Tailwind v4). */
export const kolomSalah = "border-[#c0392b]!";

const tombolDasar =
  "inline-flex h-9 min-h-[36px] w-[104px] items-center justify-center gap-1.5 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/** Tombol Edit di tabel (garis hijau tua). */
export const tombolEdit = `${tombolDasar} border-aira-primary text-aira-primary enabled:hover:bg-aira-primary/10`;

/** Tombol Hapus di tabel (garis merah). */
export const tombolHapus = `${tombolDasar} border-[#c0392b] text-[#c0392b] enabled:hover:bg-[#c0392b]/10`;

/** Tombol utama (pil hijau tua, teks putih). */
export const tombolUtama =
  "rounded-full bg-aira-primary px-8 py-3 min-h-[48px] text-base font-semibold text-white shadow-soft transition-colors hover:bg-aira-primary-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-aira-primary";

/** Tombol sekunder tanpa garis (Batal / Tutup). */
export const tombolGhost =
  "rounded-full px-6 py-3 min-h-[48px] text-base font-semibold text-aira-primary transition-colors hover:bg-aira-primary/10 disabled:cursor-not-allowed disabled:opacity-50";

/** Header kolom tabel (TITIK AIR, WILAYAH, ...). */
export const thTabel =
  "px-3 py-3 text-[13px] font-semibold uppercase tracking-wider text-aira-text/60";

/** Sel tabel: rata atas, jarak vertikal 20px. */
export const tdTabel = "px-3 py-5 align-top";
