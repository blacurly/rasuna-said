"use client";

import { useState } from "react";

import { Field, inputCls } from "@/components/dashboard/DashboardFormUi";

// Formulir "Catat kondisi air hari ini" sesuai Figma Make.
export default function UpdateWaterForm({ initialVolume = 60, tankCapacity = 1000, onSave, onCancel }) {
  const [volume, setVolume] = useState(initialVolume);
  const [note, setNote] = useState("");

  const kapasitas = tankCapacity > 0 ? tankCapacity : 1000;
  const estimatedLiters = Math.round((volume / 100) * kapasitas);

  function handleSubmit(event) {
    event.preventDefault();

    onSave({
      volume,
      liters: estimatedLiters,
      note: note.trim(),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fade-up space-y-5 rounded-[28px] border-2 border-aira-sage bg-white p-6 shadow-soft sm:p-8"
    >
      <h2 className="text-xl font-semibold text-aira-primary">Catat kondisi air hari ini</h2>

      <div>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <span className="text-[15px] font-semibold leading-normal">Volume tandon saat ini</span>
          <span className="font-heading text-2xl font-bold text-aira-primary">
            {volume}%{" "}
            <span className="text-base font-medium text-aira-text/65">
              ≈ {estimatedLiters.toLocaleString("id-ID")} L
            </span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          className="h-2 w-full cursor-pointer"
          aria-label="Volume tandon"
        />
      </div>

      <Field label="Catatan (opsional)">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Contoh: isi ulang dari tangki"
          className={inputCls}
        />
      </Field>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="min-h-[52px] w-full rounded-full bg-aira-primary px-7 py-3.5 font-semibold text-white transition-colors hover:bg-aira-primary-dark sm:w-auto"
        >
          Simpan Catatan
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[52px] w-full rounded-full px-6 py-3.5 font-semibold text-aira-primary hover:bg-aira-primary/10 sm:w-auto"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
