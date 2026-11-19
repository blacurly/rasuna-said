"use client";

import { useEffect, useState } from "react";
import { MessageSquareWarning, Send, X } from "lucide-react";

import { Field, inputCls } from "@/components/dashboard/DashboardFormUi";
import { JENIS_FORM, SUMBER_INFO_FORM } from "@/lib/kontribusiUser";

// Modal "Kirim Titik Air Baru" / "Perbaiki Titik Air" sesuai Figma Make.
// `editData` berisi item kontribusi (status Perlu Perbaikan) beserta `extra` untuk prefill.
export default function ContributionForm({ editData, onClose, onSubmit }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const prefill = editData?.extra;
  const typeOptions = editData && !JENIS_FORM.includes(editData.type) ? [editData.type, ...JENIS_FORM] : JENIS_FORM;
  const ketersediaan = [
    ["Tersedia", "Tersedia"],
    ["Terbatas", "Terbatas"],
    ["Tidak Tersedia", "Tidak tersedia"],
    ...(prefill?.availability === "Belum Diketahui" ? [["Belum Diketahui", "Belum diketahui"]] : []),
  ];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const val = (k) => String(f.get(k) ?? "").trim();

    setError("");
    setSaving(true);
    const hasil = await onSubmit({
      name: val("name"),
      type: val("type"),
      address: val("address"),
      maps: val("maps"),
      avail: val("avail"),
      hours: val("hours"),
      owner: val("owner"),
      phone: val("phone"),
      infoSource: val("infoSource"),
      note: val("note"),
    });
    if (hasil && hasil.success === false) {
      setError(hasil.message || "Kontribusi gagal dikirim.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-end justify-center bg-aira-primary-dark/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="contrib-title"
        onSubmit={handleSubmit}
        className="fade-up flex max-h-[calc(100dvh-0.5rem)] w-full max-w-2xl flex-col rounded-t-[28px] bg-white shadow-soft sm:max-h-[92vh] sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-aira-primary/10 px-4 py-5 sm:px-8">
          <div>
            <h2 id="contrib-title" className="text-xl font-semibold text-aira-primary">
              {editData ? "Perbaiki Titik Air" : "Kirim Titik Air Baru"}
            </h2>
            <p className="mt-1 text-sm leading-normal text-aira-text/65">
              {editData
                ? "Perbarui data sesuai catatan admin, lalu kirim ulang untuk diverifikasi."
                : "Lengkapi informasi yang Anda ketahui. Admin akan memverifikasi sebelum data ditampilkan."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-10 shrink-0 place-items-center rounded-full text-aira-text/70 transition-colors hover:bg-aira-primary/10"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8">
          {editData?.adminNote && (
            <p className="flex gap-2 rounded-xl bg-aira-sand p-3 text-sm leading-normal">
              <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-aira-coral-dark" />
              <span>
                <b>Catatan admin:</b> {editData.adminNote}
              </span>
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nama titik air">
              <input name="name" required autoFocus defaultValue={editData?.name} placeholder="Contoh: Sumur Komunal RT 04" className={inputCls} />
            </Field>
            <Field label="Jenis sumber">
              <select name="type" defaultValue={editData?.type} className={inputCls}>
                {typeOptions.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Alamat lengkap">
            <textarea name="address" required rows={2} defaultValue={editData?.address === "-" ? "" : editData?.address} placeholder="Jalan, RT/RW, desa, kecamatan" className={inputCls} />
          </Field>

          <Field label="Tautan Google Maps" hint="Buka lokasi di Google Maps, pilih Bagikan, lalu tempel tautannya">
            <input name="maps" type="url" defaultValue={prefill?.maps} placeholder="https://maps.app.goo.gl/..." className={inputCls} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ketersediaan air saat ini">
              <select name="avail" defaultValue={prefill?.availability} className={inputCls}>
                {ketersediaan.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jam akses">
              <input name="hours" defaultValue={prefill?.hours} placeholder="Contoh: 06.00 - 18.00" className={inputCls} />
            </Field>
            <Field label="Nama pengelola">
              <input name="owner" defaultValue={prefill?.owner} className={inputCls} />
            </Field>
            <Field label="Kontak pengelola">
              <input name="phone" type="tel" defaultValue={prefill?.phone} className={inputCls} />
            </Field>
          </div>

          <Field label="Sumber informasi (opsional)">
            <select name="infoSource" defaultValue={prefill?.infoSource ?? ""} className={inputCls}>
              <option value="">Pilih sumber informasi</option>
              {SUMBER_INFO_FORM.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>

          <Field label="Catatan tambahan">
            <textarea name="note" rows={3} defaultValue={prefill?.note} placeholder="Biaya, antrean, aturan penggunaan" className={inputCls} />
          </Field>

          {error && (
            <p role="alert" className="rounded-xl bg-aira-peach/30 px-4 py-3 text-sm font-medium leading-normal text-aira-danger-text">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-aira-primary/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] w-full rounded-full px-6 py-3 font-semibold text-aira-primary transition-colors hover:bg-aira-primary/10 sm:w-auto"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-aira-primary px-7 py-3 font-semibold text-white shadow-soft transition-colors hover:bg-aira-primary-dark disabled:opacity-70 sm:w-auto"
          >
            <Send className="size-5" /> {saving ? "Mengirim..." : editData ? "Kirim Ulang untuk Verifikasi" : "Kirim untuk Verifikasi"}
          </button>
        </div>
      </form>
    </div>
  );
}
