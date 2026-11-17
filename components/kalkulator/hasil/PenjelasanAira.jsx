"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { mintaPenjelasanAira } from "@/lib/penjelasanAira";

// Cache Promise untuk mencegah request AI yang sama dikirim berulang.
// Berlaku juga ketika React Strict Mode menjalankan ulang effect.
const cachePermintaan = new Map();
const MAKS_CACHE_PERMINTAAN = 50;

function buatKunciPermintaan(hasil, masukan) {
  try {
    return JSON.stringify({
      waktuPerhitunganUtc: hasil?.waktuPerhitunganUtc,
      hasil,
      masukan,
    });
  } catch {
    return null;
  }
}

function ambilPenjelasanSekali(kunci, hasil, masukan) {
  if (cachePermintaan.has(kunci)) {
    return cachePermintaan.get(kunci);
  }

  const permintaan = mintaPenjelasanAira(hasil, masukan);

  cachePermintaan.set(kunci, permintaan);

  // Batasi ukuran cache agar tidak terus bertambah.
  if (cachePermintaan.size > MAKS_CACHE_PERMINTAAN) {
    const kunciTerlama = cachePermintaan.keys().next().value;

    if (kunciTerlama !== undefined) {
      cachePermintaan.delete(kunciTerlama);
    }
  }

  return permintaan;
}

export default function PenjelasanAira({
  hasil,
  masukan,
  pesanCadangan = "",
}) {
  const [state, setState] = useState({
    kunci: null,
    tahap: "memuat",
    teks: "",
  });

  const idPerhitungan = hasil?.waktuPerhitunganUtc;
  const hasilValid = Boolean(hasil && idPerhitungan);

  const kunciPermintaan = hasilValid
    ? buatKunciPermintaan(hasil, masukan)
    : null;

  const stateSesuai =
    Boolean(kunciPermintaan) &&
    state.kunci === kunciPermintaan;

  const tahapTampilan = !hasilValid || !kunciPermintaan
    ? "gagal"
    : stateSesuai
      ? state.tahap
      : "memuat";

  const teksTampilan = stateSesuai ? state.teks : "";

  useEffect(() => {
    let batal = false;

    if (!hasilValid || !kunciPermintaan) {
      return () => {
        batal = true;
      };
    }

    async function ambilPenjelasan() {
      try {
        const teksAI = await ambilPenjelasanSekali(
          kunciPermintaan,
          hasil,
          masukan
        );

        if (batal) return;

        if (
          typeof teksAI === "string" &&
          teksAI.trim().length > 0
        ) {
          setState({
            kunci: kunciPermintaan,
            tahap: "siap",
            teks: teksAI.trim(),
          });
        } else {
          setState({
            kunci: kunciPermintaan,
            tahap: "gagal",
            teks: "",
          });
        }
      } catch (err) {
        console.error(
          "[PenjelasanAira] Gagal mengambil penjelasan AI:",
          err
        );

        if (!batal) {
          setState({
            kunci: kunciPermintaan,
            tahap: "gagal",
            teks: "",
          });
        }
      }
    }

    ambilPenjelasan();

    return () => {
      batal = true;
    };
  }, [hasilValid, kunciPermintaan, hasil, masukan]);

  return (
    <div aria-live="polite" className="space-y-3">
      {tahapTampilan === "memuat" && (
        <p
          className="text-aira-body leading-relaxed text-aira-text/60"
          role="status"
        >
          Menyiapkan penjelasan hasil perhitungan...
        </p>
      )}

      {tahapTampilan === "siap" && (
        <p className="text-aira-body leading-relaxed text-aira-text/85">
          {teksTampilan}
        </p>
      )}

      {tahapTampilan === "gagal" && (
        <>
          {pesanCadangan && <p>{pesanCadangan}</p>}

          <p
            className="flex items-start gap-2 text-sm leading-relaxed text-aira-text/70"
            role="status"
          >
            <Info
              className="mt-0.5 size-4 shrink-0 text-aira-primary"
              aria-hidden="true"
            />
            <span>
              Penjelasan belum dapat dimuat. Namun, hasil perhitungan dan
              langkah yang disarankan tetap dapat digunakan.
            </span>
          </p>
        </>
      )}
    </div>
  );
}
