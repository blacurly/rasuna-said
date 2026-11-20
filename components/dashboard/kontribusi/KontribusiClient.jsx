"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePlus, MapPinPlus, Plus, Trash2, X } from "lucide-react";

import DashboardPageHead from "@/components/dashboard/DashboardPageHead";
import { kirimKontribusiUserAction } from "@/app/actions/kontribusi-user";

import ContributionForm from "./ContributionForm";
import ContributionList from "./ContributionList";

const tombolUtama =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-aira-primary px-6 py-3 font-semibold text-white shadow-soft transition-colors hover:bg-aira-primary-dark sm:w-auto";

// B04 - Kontribusi Titik Air. Dua versi mengikuti data:
// User Baru (belum ada kontribusi) -> keadaan kosong; User Lama -> daftar "Kontribusi Anda".
export default function KontribusiClient({ items }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const triggerRef = useRef(null);

  const showEmpty = items.length === 0 && !sent;

  const bukaForm = (item = null) => {
    setSent(false);
    setEditing(item);
    setOpen(true);
  };
  const tutupForm = () => {
    setOpen(false);
    setEditing(null);
    triggerRef.current?.focus();
  };

  async function kirim(form) {
    const hasil = await kirimKontribusiUserAction(form, editing?.id ?? null);
    if (!hasil.success) return hasil;
    setSent(true);
    setOpen(false);
    setEditing(null);
    router.refresh();
    return hasil;
  }

  async function hapus(item) {
    setCancelTarget(item);
    setCancelError("");
  }

  async function konfirmasiBatalkan() {
    if (!cancelTarget || cancelLoading) return;
    setCancelLoading(true);
    setCancelError("");
    try {
      const response = await fetch(`/api/contributions/${cancelTarget.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setCancelError(result?.message || "Kontribusi belum dapat dibatalkan. Coba muat ulang halaman.");
        return;
      }
      setCancelTarget(null);
      setSent(false);
      router.refresh();
    } catch {
      setCancelError("Koneksi bermasalah. Kontribusi belum dibatalkan.");
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHead
        title="Kontribusi Titik Air"
        desc="Tambahkan titik air yang Anda ketahui. Admin akan meninjau datanya sebelum tampil di Navigasi Air."
        action={
          showEmpty ? undefined : (
            <button ref={triggerRef} type="button" onClick={() => bukaForm()} className={tombolUtama}>
              <Plus className="size-5" /> Tambah Titik Air
            </button>
          )
        }
      />

      {showEmpty ? (
        <section className="flex flex-col items-center rounded-[28px] border border-aira-primary/5 bg-white px-6 py-12 text-center shadow-soft sm:py-16">
          <span className="grid size-16 place-items-center rounded-full bg-aira-sage/35 text-aira-primary">
            <MapPinPlus className="size-7" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-aira-primary">Belum Ada Kontribusi</h2>
          <p className="mt-2 max-w-[420px] leading-normal text-aira-text/70">
            Silakan mulai menambahkan titik air yang Anda ketahui. Admin akan meninjau datanya sebelum tampil di Navigasi Air.
          </p>
          <button ref={triggerRef} type="button" onClick={() => bukaForm()} className={`mt-6 ${tombolUtama}`}>
            <CirclePlus className="size-5" /> Mulai Kontribusi Titik Air
          </button>
        </section>
      ) : (
        <section className="rounded-[28px] border border-aira-primary/5 bg-white p-6 shadow-soft sm:p-8">
          <h2 className="text-xl font-semibold text-aira-primary">Kontribusi Anda</h2>
          {sent && (
            <p role="status" className="mt-3 rounded-xl bg-aira-sage/35 px-4 py-3 text-sm font-medium leading-normal text-aira-primary-dark">
              Terkirim. Statusnya kini Menunggu Verifikasi dan belum tampil di Navigasi Air sampai admin memverifikasinya.
            </p>
          )}
          <ContributionList items={items} onEdit={bukaForm} onDelete={hapus} />
        </section>
      )}


      {cancelTarget && (
        <section className="rounded-2xl border border-aira-danger-text/20 bg-aira-peach/15 p-5" aria-labelledby="cancel-contribution-title">
          <h3 id="cancel-contribution-title" className="font-semibold text-aira-primary">Batalkan kontribusi?</h3>
          <p className="mt-2 text-sm leading-relaxed text-aira-text/75">Kontribusi <strong>{cancelTarget.name}</strong> akan dibatalkan. Tindakan ini hanya tersedia selama kontribusi menunggu verifikasi.</p>
          {cancelError && <p role="alert" className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-aira-danger-text">{cancelError}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={cancelLoading} onClick={konfirmasiBatalkan} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-aira-danger-text px-5 py-2 font-semibold text-white disabled:opacity-60"><Trash2 className="size-4"/>{cancelLoading ? "Membatalkan…" : "Ya, batalkan"}</button>
            <button type="button" disabled={cancelLoading} onClick={() => setCancelTarget(null)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-aira-primary/20 px-5 py-2 font-semibold text-aira-primary"><X className="size-4"/>Kembali</button>
          </div>
        </section>
      )}

      {open && <ContributionForm key={editing?.id ?? "baru"} editData={editing} onClose={tutupForm} onSubmit={kirim} />}
    </div>
  );
}
