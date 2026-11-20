import { CalendarDays, MapPin, MessageSquareWarning, Trash2 } from "lucide-react";

import VerificationBadge from "./VerificationBadge";

// Daftar kartu "Kontribusi Anda" sesuai Figma Make.
export default function ContributionList({ items, onEdit, onDelete }) {
  return (
    <ul className="mt-4 space-y-4">
      {items.map((s) => (
        <li key={s.id} className="rounded-2xl bg-aira-bg p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase leading-normal tracking-widest text-aira-text/55">
                {s.type}
              </p>
              <p className="font-heading text-lg font-semibold leading-snug tracking-normal text-aira-primary">
                {s.name}
              </p>
            </div>
            <VerificationBadge status={s.status} />
          </div>

          <p className="mt-2 flex gap-2 text-[15px] leading-normal text-aira-text/80">
            <MapPin className="mt-1 size-4 shrink-0 text-aira-peach" /> {s.address}
          </p>
          <p className="mt-1 flex gap-2 text-sm leading-normal text-aira-text/65">
            <CalendarDays className="mt-0.5 size-4 shrink-0" /> Dikirim {s.submitted}
          </p>

          {s.adminNote && (
            <p className="mt-3 flex gap-2 rounded-xl bg-aira-sand p-3 text-sm leading-normal">
              <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-aira-coral-dark" />
              <span>
                <b>Catatan admin:</b> {s.adminNote}
              </span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {s.status === "Perlu Perbaikan" && (
              <button
                type="button"
                onClick={() => onEdit(s)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-aira-primary px-5 py-2.5 font-semibold text-aira-primary transition-colors hover:bg-aira-primary/10"
              >
                Perbaiki dan Kirim Ulang
              </button>
            )}
            {s.status === "Menunggu Verifikasi" && (
              <button
                type="button"
                onClick={() => onDelete(s)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-aira-danger-text/30 px-4 py-2.5 text-sm font-semibold text-aira-danger-text transition-colors hover:bg-aira-peach/20"
              >
                <Trash2 className="size-4" /> Batalkan kontribusi
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
