"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePlus, MapPinPlus, Plus } from "lucide-react";

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
          <ContributionList items={items} onEdit={bukaForm} />
        </section>
      )}

      {open && <ContributionForm key={editing?.id ?? "baru"} editData={editing} onClose={tutupForm} onSubmit={kirim} />}
    </div>
  );
}
