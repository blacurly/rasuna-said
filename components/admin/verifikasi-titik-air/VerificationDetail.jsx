"use client";

import { useState } from "react";

import {
  X,
  MapPin,
  UserRound,
  CalendarDays,
  Droplets,
  Phone,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ClipboardList,
  BookOpen,
  MessageSquareText,
  FileText,
} from "lucide-react";

import {
  VerificationBadge,
  AvailabilityBadge,
} from "./VerificationBadge";

import {
  formatContributor,
  formatCategory,
} from "./formatters";

const AVAILABILITY_OPTIONS = [
  {
    value: "unknown",
    label: "Belum Diketahui",
  },
  {
    value: "available",
    label: "Tersedia",
  },
  {
    value: "limited",
    label: "Terbatas",
  },
  {
    value: "unavailable",
    label: "Tidak Tersedia",
  },
];

function getAvailabilityLabel(status) {
  const option = AVAILABILITY_OPTIONS.find(
    (item) => item.value === status
  );

  return option?.label || "Belum Diketahui";
}

export default function VerificationDetail({
  item,
  onClose,
  onUpdateStatus,
  saving = false,
}) {
  const [draftState, setDraftState] = useState(() => ({
    itemId: item?.id ?? null,
    notes: item?.adminReviewNote || "",
    availabilityStatus: item?.availability || "unknown",
  }));

  if (!item) return null;

  /*
   * Draft mengikuti ID kontribusi yang sedang dibuka.
   * Tidak membutuhkan useEffect untuk mereset state.
   */
  const draft =
    draftState.itemId === item.id
      ? draftState
      : {
          itemId: item.id,
          notes: item.adminReviewNote || "",
          availabilityStatus:
            item.availability || "unknown",
        };

  const isWaiting =
    item.reviewStatus === "pending" ||
    item.verificationStatus === "Menunggu Verifikasi";

  function updateDraft(changes) {
    setDraftState({
      ...draft,
      ...changes,
      itemId: item.id,
    });
  }

  function handleDecision(status) {
    if (saving) return;

    onUpdateStatus(
      item.id,
      status,
      draft.notes,
      draft.availabilityStatus
    );
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-aira-primary/10 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-aira-primary/70">
              Detail Kontribusi
            </p>

            <h2
              id="verification-title"
              className="mt-1 text-xl font-bold text-aira-primary"
            >
              Pemeriksaan Titik Air
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail"
            disabled={saving}
            className="rounded-full p-2 text-aira-text/50 transition hover:bg-aira-bg hover:text-aira-primary disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Nama titik air */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-aira-text/55">
              Nama titik air
            </p>

            <h3 className="mt-1 text-lg font-bold text-aira-primary">
              {item.name}
            </h3>

            <p className="mt-1 text-sm text-aira-text/60">
              ID Kontribusi: {item.id}
            </p>
          </div>

          {/* Status */}
          <div className="flex flex-wrap gap-2">
            <AvailabilityBadge
              status={item.availability || "unknown"}
            />

            <VerificationBadge
              status={item.verificationStatus}
            />
          </div>

          {/* Usulan ketersediaan dari kontributor */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
              Usulan Ketersediaan dari Kontributor
            </p>

            <p className="mt-1 text-sm font-semibold text-blue-900">
              {getAvailabilityLabel(
                item.proposedAvailability
              )}
            </p>

            <p className="mt-1 text-xs leading-relaxed text-blue-800/80">
              Informasi ini merupakan usulan kontributor
              dan belum menjadi status final titik air.
            </p>
          </div>

          {/* Informasi kontributor */}
          <div className="grid gap-4 rounded-xl bg-aira-bg p-4 sm:grid-cols-2">
            <Info
              icon={UserRound}
              label="Pengirim"
              value={formatContributor(item.contributor)}
            />

            <Info
              icon={Droplets}
              label="Kategori titik air"
              value={formatCategory(item.category)}
            />

            <Info
              icon={CalendarDays}
              label="Tanggal pengiriman"
              value={item.submittedAt}
            />

            <Info
              icon={Phone}
              label="Nama pengelola dan kontak"
              value={item.contact}
            />
          </div>

          {/* Lokasi */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-aira-text">
              <MapPin
                size={18}
                className="text-aira-primary"
              />
              Informasi Lokasi
            </h4>

            <div className="space-y-3 rounded-xl border border-aira-primary/10 p-4">
              <Info
                label="Alamat"
                value={item.address}
              />

              <Info
                label="Koordinat"
                value={item.coordinates}
              />
            </div>
          </div>

          {/* Deskripsi kontribusi */}
          <div>
            <h4 className="mb-2 text-base font-semibold text-aira-text">
              Deskripsi Kontribusi
            </h4>

            <p className="whitespace-pre-wrap rounded-xl bg-aira-bg p-4 text-sm leading-relaxed text-aira-text/75">
              {item.description || "Tidak ada deskripsi."}
            </p>
          </div>

          {/* Catatan kontributor */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-aira-text">
              <MessageSquareText
                size={18}
                className="text-aira-primary"
              />
              Catatan Kontributor
            </h4>

            <p className="whitespace-pre-wrap rounded-xl border border-aira-primary/10 bg-white p-4 text-sm leading-relaxed text-aira-text/75">
              {item.notes ||
                "Kontributor tidak memberikan catatan."}
            </p>
          </div>

          {/* Panduan pemeriksaan admin */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-aira-text">
              <BookOpen
                size={18}
                className="text-aira-primary"
              />
              Panduan Pemeriksaan Admin
            </h4>

            <div className="whitespace-pre-wrap rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-slate-700">
              {item.adminReviewGuidance ||
                "Belum ada panduan pemeriksaan khusus untuk kontribusi ini."}
            </div>
          </div>

          {/* Catatan keputusan admin */}
          <div>
            <label
              htmlFor="verification-notes"
              className="mb-2 flex items-center gap-2 text-base font-semibold text-aira-text"
            >
              <ClipboardList
                size={18}
                className="text-aira-primary"
              />
              Catatan Keputusan Admin
            </label>

            {isWaiting ? (
              <textarea
                id="verification-notes"
                value={draft.notes}
                onChange={(event) =>
                  updateDraft({
                    notes: event.target.value,
                  })
                }
                placeholder="Tuliskan alasan keputusan atau informasi perbaikan untuk kontributor..."
                rows={4}
                disabled={saving}
                className="w-full resize-y rounded-xl border border-aira-primary/15 bg-white p-3 text-sm text-aira-text outline-none transition focus:border-aira-secondary focus:ring-2 focus:ring-aira-secondary/20 disabled:opacity-60"
              />
            ) : (
              <p className="whitespace-pre-wrap rounded-xl bg-aira-bg p-4 text-sm leading-relaxed text-aira-text/75">
                {item.adminReviewNote ||
                  "Tidak ada catatan keputusan admin."}
              </p>
            )}
          </div>

          {/* Bukti pendukung */}
          {item.evidenceUrl && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-aira-text">
                <FileText
                  size={18}
                  className="text-aira-primary"
                />
                Tautan Lokasi / Bukti Pendukung
              </h4>

              <a
                href={item.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-aira-primary underline underline-offset-2 hover:text-aira-secondary"
              >
                Buka tautan yang dikirim kontributor
              </a>
            </div>
          )}

          {/* Keputusan verifikasi */}
          {isWaiting ? (
            <div className="space-y-3 border-t border-aira-primary/10 pt-4">
              <p className="text-sm font-semibold text-aira-text">
                Keputusan Verifikasi
              </p>

              {/* Pilihan status ketersediaan */}
              <div>
                <label
                  htmlFor="availability-status"
                  className="mb-2 block text-sm font-semibold text-aira-text"
                >
                  Tetapkan Status Ketersediaan Air
                </label>

                <select
                  id="availability-status"
                  value={draft.availabilityStatus}
                  onChange={(event) =>
                    updateDraft({
                      availabilityStatus: event.target.value,
                    })
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-aira-primary/15 bg-white p-3 text-sm text-aira-text outline-none transition focus:border-aira-secondary focus:ring-2 focus:ring-aira-secondary/20 disabled:opacity-60"
                >
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-xs leading-relaxed text-aira-text/60">
                  Status ini digunakan ketika kontribusi
                  disetujui. Pilih berdasarkan hasil
                  pemeriksaan admin, bukan hanya usulan
                  kontributor.
                </p>
              </div>

              {/* Tombol verifikasi */}
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handleDecision("Terverifikasi")
                }
                className="flex w-full items-center justify-center gap-2 rounded-full bg-aira-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-aira-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={17} />
                {saving
                  ? "Menyimpan..."
                  : "Verifikasi Kontribusi"}
              </button>

              {/* Tombol revisi */}
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handleDecision("Perlu Perbaikan")
                }
                className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AlertCircle size={17} />
                Minta Perbaikan
              </button>

              {/* Tombol penolakan */}
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handleDecision("Ditolak")
                }
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FCE3DC] px-4 py-3 text-sm font-semibold text-[#A94D37] transition hover:bg-[#F8D2C8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle size={17} />
                Tolak Kontribusi
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-aira-bg p-4 text-sm text-aira-text/65">
              Kontribusi ini sudah mendapatkan keputusan
              pemeriksaan.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-aira-text/55">
        {Icon && <Icon size={14} />}
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-aira-text">
        {value || "-"}
      </p>
    </div>
  );
}
