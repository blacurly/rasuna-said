"""Logika tunggal Kalkulator Air AIRA untuk dipakai oleh notebook dan aplikasi.

Asumsi prototype yang perlu divalidasi: 15 L/orang/hari, tambahan MHM
5 L/orang/hari, dan ambang status 1 serta 3 hari.
"""
import math
from datetime import datetime, timezone

KEBUTUHAN_PER_ORANG_LITER_HARI = 15
TAMBAHAN_AIR_MHM_PER_ORANG_LITER_HARI = 5
BATAS_KRISIS_HARI = 1
BATAS_WASPADA_HARI = 3

STATUS_AMAN = "Aman / Relatif Mencukupi"
STATUS_WASPADA = "Waspada"
STATUS_KRISIS = "Mode Krisis"
STATUS_TIDAK_DITENTUKAN = "Belum Dapat Ditentukan"

def _is_int(nilai):
    """True jika nilai bilangan bulat (bool tidak dihitung)."""
    return isinstance(nilai, int) and not isinstance(nilai, bool)


def _is_angka(nilai):
    """True jika nilai angka berhingga (bool, NaN, dan infinity ditolak)."""
    return (
        isinstance(nilai, (int, float))
        and not isinstance(nilai, bool)
        and math.isfinite(nilai)
    )


def klasifikasikan_status(durasi, kondisi_sumber_air):
    """Tentukan (status_durasi, status_akhir, alasan) dari durasi dan kondisi sumber."""
    if durasi < BATAS_KRISIS_HARI:
        status_durasi = STATUS_KRISIS
        alasan = (
            "Estimasi cadangan kurang dari 1 hari total kebutuhan air "
            "harian, termasuk kebutuhan MHM jika berlaku."
        )
    elif durasi <= BATAS_WASPADA_HARI:
        status_durasi = STATUS_WASPADA
        alasan = (
            "Estimasi cadangan berada pada rentang 1 sampai 3 hari "
            "total kebutuhan air harian."
        )
    else:
        status_durasi = STATUS_AMAN
        alasan = (
            "Estimasi cadangan lebih dari 3 hari berdasarkan asumsi "
            "prototype dan total kebutuhan air harian."
        )

    # Kondisi sumber air menjadi faktor konteks tambahan
    if kondisi_sumber_air == "Belum diketahui":
        return status_durasi, STATUS_TIDAK_DITENTUKAN, (
            "Durasi cadangan dapat dihitung, tetapi kondisi sumber "
            "air utama belum diketahui."
        )

    if kondisi_sumber_air == "Tidak berfungsi":
        return status_durasi, STATUS_KRISIS, (
            "Sumber air utama dilaporkan tidak berfungsi; perlu "
            "menyiapkan sumber alternatif meskipun cadangan "
            "tersimpan masih ada."
        )

    if kondisi_sumber_air == "Terbatas" and status_durasi == STATUS_AMAN:
        return status_durasi, STATUS_WASPADA, (
            "Cadangan tersimpan diperkirakan cukup lebih dari 3 hari, "
            "tetapi sumber air utama sedang terbatas."
        )

    return status_durasi, status_durasi, alasan


def hitung_ketahanan_air(
    jumlah_anggota,
    sumber_air_utama,
    kondisi_sumber_air,
    volume_cadangan_liter=None,
    kapasitas_tangki_liter=None,
    persentase_isi=None,
    lokasi=None,
    kebutuhan_mhm=False,
    jumlah_anggota_mhm=0,
    tambahan_air_mhm_per_orang=TAMBAHAN_AIR_MHM_PER_ORANG_LITER_HARI,
    kebutuhan_per_orang=KEBUTUHAN_PER_ORANG_LITER_HARI,
):
    """Hitung ketahanan air berdasarkan aturan deterministik prototype AIRA.

    Volume cadangan menggunakan volume aktual jika tersedia; jika tidak,
    volume dihitung dari kapasitas tangki × persentase isi.

    Kebutuhan dasar dihitung berdasarkan seluruh anggota keluarga.
    Jika kebutuhan_mhm=True, tambahan kebutuhan air dihitung berdasarkan
    jumlah anggota keluarga yang membutuhkan MHM × 5 liter/orang/hari
    secara default.

    Jumlah anggota MHM tidak boleh melebihi jumlah seluruh anggota keluarga.
    """

    errors = []

    # 1. Validasi jumlah keluarga dan kebutuhan dasar
    if not _is_int(jumlah_anggota) or jumlah_anggota <= 0:
        errors.append(
            "Jumlah anggota keluarga harus berupa bilangan bulat lebih dari 0."
        )

    if not _is_angka(kebutuhan_per_orang) or kebutuhan_per_orang <= 0:
        errors.append("Kebutuhan air per orang harus berupa angka lebih dari 0.")

    if not isinstance(sumber_air_utama, str) or not sumber_air_utama.strip():
        errors.append("Sumber air utama wajib diisi.")

    # 2. Validasi input MHM
    if not isinstance(kebutuhan_mhm, bool):
        errors.append("kebutuhan_mhm harus bernilai True atau False.")

    if not _is_int(jumlah_anggota_mhm) or jumlah_anggota_mhm < 0:
        errors.append(
            "Jumlah anggota yang membutuhkan MHM harus berupa "
            "bilangan bulat 0 atau lebih."
        )
    elif (
        _is_int(jumlah_anggota)
        and jumlah_anggota > 0
        and jumlah_anggota_mhm > jumlah_anggota
    ):
        errors.append(
            "Jumlah anggota yang membutuhkan MHM tidak boleh "
            "melebihi jumlah seluruh anggota keluarga."
        )

    if not _is_angka(tambahan_air_mhm_per_orang) or tambahan_air_mhm_per_orang < 0:
        errors.append("Tambahan air MHM per orang harus berupa angka 0 atau lebih.")

    if kebutuhan_mhm is False and jumlah_anggota_mhm != 0:
        errors.append("Jika kebutuhan_mhm=False, jumlah_anggota_mhm harus 0.")

    if kebutuhan_mhm is True and jumlah_anggota_mhm == 0:
        errors.append(
            "Jika kebutuhan_mhm=True, masukkan jumlah anggota "
            "keluarga yang membutuhkan MHM."
        )

    # 3. Validasi kondisi sumber air
    pilihan_kondisi = {"Normal", "Terbatas", "Tidak berfungsi", "Belum diketahui"}

    if kondisi_sumber_air not in pilihan_kondisi:
        errors.append(
            "Kondisi sumber air harus salah satu dari: "
            f"{', '.join(sorted(pilihan_kondisi))}."
        )

    # 4. Validasi dan tentukan metode volume cadangan
    menggunakan_volume_aktual = volume_cadangan_liter is not None
    cadangan = None

    if menggunakan_volume_aktual:
        if not _is_angka(volume_cadangan_liter) or volume_cadangan_liter < 0:
            errors.append("Volume cadangan aktual harus berupa angka 0 atau lebih.")
        else:
            cadangan = float(volume_cadangan_liter)

        if kapasitas_tangki_liter is not None:
            if not _is_angka(kapasitas_tangki_liter) or kapasitas_tangki_liter <= 0:
                errors.append("Jika diisi, kapasitas tangki harus lebih dari 0.")
            elif cadangan is not None and cadangan > kapasitas_tangki_liter:
                errors.append("Volume cadangan tidak boleh melebihi kapasitas tangki.")
    else:
        if not _is_angka(kapasitas_tangki_liter) or kapasitas_tangki_liter <= 0:
            errors.append(
                "Isi volume aktual, atau masukkan kapasitas tangki lebih dari 0."
            )

        if not _is_angka(persentase_isi) or not 0 <= persentase_isi <= 100:
            errors.append("Persentase isi tangki harus berada pada rentang 0–100%.")

        if not errors:
            cadangan = float(kapasitas_tangki_liter) * (float(persentase_isi) / 100)

    # Bagian yang sama untuk hasil valid maupun tidak valid
    identitas = {
        "lokasi": lokasi,
        "jumlah_anggota": jumlah_anggota,
        "sumber_air_utama": sumber_air_utama,
        "kondisi_sumber_air": kondisi_sumber_air,
        "kebutuhan_mhm": kebutuhan_mhm,
        "jumlah_anggota_mhm": jumlah_anggota_mhm,
    }
    penutup = {
        "metode_volume": (
            "volume aktual" if menggunakan_volume_aktual else "kapasitas × persentase"
        ),
        "waktu_perhitungan_utc": datetime.now(timezone.utc).isoformat(),
    }

    # 5. Hasil belum dapat ditentukan jika input wajib tidak valid
    if errors:
        return {
            "valid": False,
            "errors": errors,
            **identitas,
            "kebutuhan_dasar_liter": None,
            "tambahan_air_mhm_liter": None,
            "kebutuhan_harian_liter": None,
            "cadangan_air_liter": None,
            "durasi_hari": None,
            "status": STATUS_TIDAK_DITENTUKAN,
            "alasan_status": "Data wajib tidak lengkap atau tidak valid.",
            **penutup,
        }

    # 6. Hitung kebutuhan dasar, tambahan MHM, dan total kebutuhan
    kebutuhan_dasar = float(jumlah_anggota) * float(kebutuhan_per_orang)
    tambahan_mhm = (
        float(jumlah_anggota_mhm) * float(tambahan_air_mhm_per_orang)
        if kebutuhan_mhm
        else 0.0
    )
    kebutuhan_harian = kebutuhan_dasar + tambahan_mhm

    # 7. Durasi cadangan memakai total kebutuhan harian
    durasi = cadangan / kebutuhan_harian

    # 8. Klasifikasi status
    status_durasi, status, alasan = klasifikasikan_status(durasi, kondisi_sumber_air)

    # 9. Kembalikan hasil kalkulasi
    return {
        "valid": True,
        "errors": [],
        **identitas,
        "jumlah_anggota": int(jumlah_anggota),
        "jumlah_anggota_mhm": int(jumlah_anggota_mhm),
        "kebutuhan_per_orang_liter_hari": float(kebutuhan_per_orang),
        "tambahan_air_mhm_per_orang_liter_hari": float(tambahan_air_mhm_per_orang),
        "kebutuhan_dasar_liter": round(kebutuhan_dasar, 2),
        "tambahan_air_mhm_liter": round(tambahan_mhm, 2),
        "kebutuhan_harian_liter": round(kebutuhan_harian, 2),
        "cadangan_air_liter": round(cadangan, 2),
        "durasi_hari": round(durasi, 2),
        "status_durasi": status_durasi,
        "status": status,
        "alasan_status": alasan,
        **penutup,
    }


print("Fungsi kalkulator siap.")
