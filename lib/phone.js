// Normalisasi nomor telepon Indonesia untuk tautan tel:/WhatsApp.
// Mengembalikan E.164 (+62...) atau null jika kosong/tidak valid.
export function normalizeIndonesianPhone(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Hanya izinkan karakter pemisah telepon yang lazim; huruf/ekstensi ditolak.
  if (!/^[+0-9().\s-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0062")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (!digits.startsWith("62")) digits = `62${digits}`;

  if (!/^62[1-9][0-9]{7,12}$/.test(digits)) return null;
  return `+${digits}`;
}
