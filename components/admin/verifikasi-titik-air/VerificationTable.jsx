"use client";

import { VerificationBadge, AvailabilityBadge } from "./VerificationBadge";
import {
  formatCategory,
  formatContributor,
  formatSubmittedDate,
} from "./formatters";

const thClass =
  "px-3 pb-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-aira-text/45";
const labelClass =
  "mb-1 text-[10px] font-medium uppercase tracking-wider text-aira-text/40";

function subtitle(item) {
  return [formatCategory(item.category), item.location]
    .filter(Boolean)
    .join(" · ");
}

function ActionButton({ onClick, activeTab, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full bg-aira-primary text-sm font-semibold text-white transition hover:bg-aira-primary/90 focus:outline-none focus:ring-2 focus:ring-aira-secondary/40 ${className}`}
    >
      {activeTab === "waiting" ? "Tinjau" : "Lihat"}
    </button>
  );
}

export default function VerificationTable({ data = [], onSelect, activeTab }) {
  return (
    <div className="w-full">
      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[20%]" />
            <col className="w-[30%]" />
            <col className="w-[16%]" />
          </colgroup>

          <thead>
            <tr className="border-b border-aira-primary/10">
              <th className={thClass}>Titik Air</th>
              <th className={thClass}>Pengirim</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} text-right`}>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {data.length > 0 ? (
              data.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-aira-primary/[0.08] transition-colors last:border-b-0 hover:bg-aira-bg/60"
                >
                  {/* Titik air */}
                  <td className="min-w-0 px-3 py-4 align-middle">
                    <p className="break-words text-sm font-semibold leading-snug text-aira-primary">
                      {item.name}
                    </p>
                    {subtitle(item) && (
                      <p className="mt-1 break-words text-xs leading-snug text-aira-text/55">
                        {subtitle(item)}
                      </p>
                    )}
                  </td>

                  {/* Pengirim */}
                  <td className="min-w-0 px-3 py-4 align-middle">
                    <p
                      className="truncate text-sm font-medium leading-snug text-aira-text/80"
                      title={String(item.contributor ?? "")}
                    >
                      {formatContributor(item.contributor)}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-aira-text/50">
                      {formatSubmittedDate(item.submittedAt)}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="min-w-0 px-3 py-4 align-middle">
                    <div className="flex flex-col items-start gap-2.5">
                      <div>
                        <p className={labelClass}>Ketersediaan</p>
                        <AvailabilityBadge status={item.availability} />
                      </div>
                      <div>
                        <p className={labelClass}>Verifikasi</p>
                        <VerificationBadge status={item.verificationStatus} />
                      </div>
                    </div>
                  </td>

                  {/* Aksi */}
                  <td className="px-3 py-4 align-middle">
                    <div className="flex justify-end">
                      <ActionButton
                        onClick={() => onSelect(item)}
                        activeTab={activeTab}
                        className="min-w-[88px] px-5 py-2"
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <p className="text-sm font-medium text-aira-text/60">
                    Belum ada kontribusi pada kategori ini.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE / TABLET VIEW ================= */}
      <div className="space-y-3 lg:hidden">
        {data.length > 0 ? (
          data.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-aira-primary/10 bg-white p-4"
            >
              <div className="mb-3">
                <p className="break-words text-sm font-semibold text-aira-primary">
                  {item.name}
                </p>
                {subtitle(item) && (
                  <p className="mt-1 text-xs text-aira-text/55">
                    {subtitle(item)}
                  </p>
                )}
              </div>

              <p className="mb-3 text-xs text-aira-text/60">
                <span className="font-medium text-aira-text/80">
                  {formatContributor(item.contributor)}
                </span>
                {" · "}
                {formatSubmittedDate(item.submittedAt)}
              </p>

              <div className="mb-3 flex flex-wrap gap-x-6 gap-y-3">
                <div>
                  <p className={labelClass}>Ketersediaan</p>
                  <AvailabilityBadge status={item.availability} />
                </div>
                <div>
                  <p className={labelClass}>Verifikasi</p>
                  <VerificationBadge status={item.verificationStatus} />
                </div>
              </div>

              <div className="flex justify-end border-t border-aira-primary/10 pt-3">
                <ActionButton
                  onClick={() => onSelect(item)}
                  activeTab={activeTab}
                  className="px-5 py-2"
                />
              </div>
            </article>
          ))
        ) : (
          <div className="py-10 text-center text-sm text-aira-text/50">
            Belum ada kontribusi pada kategori ini.
          </div>
        )}
      </div>
    </div>
  );
} 