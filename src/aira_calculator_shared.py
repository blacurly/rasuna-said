"""Logika tunggal Kalkulator Air AIRA untuk dipakai oleh notebook dan aplikasi."""
import math
from datetime import datetime, timezone

# KONSTANTA UTAMA
KEBUTUHAN_PER_ORANG_LITER_HARI = 15
TAMBAHAN_AIR_MHM_PER_ORANG_LITER_HARI = 5
KOEFISIEN_PANEN_AIR_HUJAN = 0.8
CURAH_HUJAN_STATIS_METER = 0.01  # 0.01 m (10 mm)

BATAS_KRISIS_HARI = 1
BATAS_WASPADA_HARI = 3

STATUS_AMAN = "Aman / Relatif Mencukupi"
STATUS_WASPADA = "Waspada"
STATUS_KRISIS = "Mode Krisis"
STATUS_TIDAK_DITENTUKAN = "Belum Dapat Ditentukan"

def _is_int(nilai):
    return isinstance(nilai, int) and not isinstance(nilai, bool)

def _is_angka(nilai):
    return isinstance(nilai, (int, float)) and not isinstance(nilai, bool) and math.isfinite(nilai)

def hitung_potensi_panen_air_hujan(luas_atap_m2, curah_hujan_m=CURAH_HUJAN_STATIS_METER, koefisien=KOEFISIEN_PANEN_AIR_HUJAN):
    """Menghitung potensi air hujan: V = P x A x C (dalam liter)."""
    if not _is_angka(luas_atap_m2) or luas_atap_m2 <= 0:
        return 0.0
    volume_m3 = float(curah_hujan_m) * float(luas_atap_m2) * float(koefisien)
    return round(volume_m3 * 1000.0, 2)

def klasifikasikan_status(durasi, kondisi_sumber_air):
    if durasi < BATAS_KRISIS_HARI:
        status_durasi = STATUS_KRISIS
        alasan = "Estimasi cadangan kurang dari 1 hari total kebutuhan air harian."
    elif durasi <= BATAS_WASPADA_HARI:
        status_durasi = STATUS_WASPADA
        alasan = "Estimasi cadangan berada pada rentang 1 sampai 3 hari total kebutuhan air harian."
    else:
        status_durasi = STATUS_AMAN
        alasan = "Estimasi cadangan lebih dari 3 hari berdasarkan total kebutuhan air harian."

    if kondisi_sumber_air == "Belum diketahui":
        return status_durasi, STATUS_TIDAK_DITENTUKAN, "Kondisi sumber air utama belum diketahui."
    if kondisi_sumber_air == "Tidak berfungsi":
        return status_durasi, STATUS_KRISIS, "Sumber air utama dilaporkan tidak berfungsi."
    if kondisi_sumber_air == "Terbatas" and status_durasi == STATUS_AMAN:
        return status_durasi, STATUS_WASPADA, "Cadangan tersimpan diperkirakan cukup lebih dari 3 hari, tetapi sumber air utama sedang terbatas."

    return status_durasi, status_durasi, alasan

def hitung_ketahanan_air(
    jumlah_anggota,
    sumber_air_utama,
    kondisi_sumber_air,
    volume_cadangan_liter=None,
    kapasitas_tangki_liter=None,
    persentase_isi=None,
    luas_atap_m2=None,
    lokasi=None,
    kebutuhan_mhm=False,
    jumlah_anggota_mhm=0,
    tambahan_air_mhm_per_orang=TAMBAHAN_AIR_MHM_PER_ORANG_LITER_HARI,
    kebutuhan_per_orang=KEBUTUHAN_PER_ORANG_LITER_HARI,
):
    errors = []

    # Validasi dasar
    if not _is_int(jumlah_anggota) or jumlah_anggota <= 0:
        errors.append("Jumlah anggota keluarga harus berupa bilangan bulat > 0.")
    if not isinstance(sumber_air_utama, str) or not sumber_air_utama.strip():
        errors.append("Sumber air utama wajib diisi.")

    # Validasi MHM
    if not isinstance(kebutuhan_mhm, bool):
        errors.append("kebutuhan_mhm harus True/False.")
    if not _is_int(jumlah_anggota_mhm) or jumlah_anggota_mhm < 0:
        errors.append("Jumlah anggota MHM harus >= 0.")
    elif _is_int(jumlah_anggota) and jumlah_anggota > 0 and jumlah_anggota_mhm > jumlah_anggota:
        errors.append("Jumlah anggota MHM tidak boleh melebihi jumlah anggota keluarga.")

    if kebutuhan_mhm is False and jumlah_anggota_mhm != 0:
        errors.append("Jika kebutuhan_mhm=False, jumlah_anggota_mhm harus 0.")
    if kebutuhan_mhm is True and jumlah_anggota_mhm == 0:
        errors.append("Jika kebutuhan_mhm=True, masukkan jumlah anggota MHM.")

    # Validasi Kondisi
    pilihan_kondisi = {"Normal", "Terbatas", "Tidak berfungsi", "Belum diketahui"}
    if kondisi_sumber_air not in pilihan_kondisi:
        errors.append("Kondisi sumber air tidak valid.")

    # Validasi Volume
    cadangan = None
    menggunakan_volume_aktual = volume_cadangan_liter is not None

    if menggunakan_volume_aktual:
        if not _is_angka(volume_cadangan_liter) or volume_cadangan_liter < 0:
            errors.append("Volume cadangan aktual harus >= 0.")
        else:
            cadangan = float(volume_cadangan_liter)
    else:
        if not _is_angka(kapasitas_tangki_liter) or kapasitas_tangki_liter <= 0:
            errors.append("Kapasitas tangki harus > 0.")
        if not _is_angka(persentase_isi) or not 0 <= persentase_isi <= 100:
            errors.append("Persentase isi tangki harus 0-100%.")
        if not errors:
            cadangan = float(kapasitas_tangki_liter) * (float(persentase_isi) / 100)

    # JIKA TIDAK VALID -> RETURN BELUM DAPAT DITENTUKAN
    if errors:
        return {
            "valid": False,
            "errors": errors,
            "status": STATUS_TIDAK_DITENTUKAN,
            "alasan_status": "Data wajib tidak lengkap atau tidak valid.",
            "kebutuhan_harian_liter": None,
            "cadangan_air_liter": None,
            "durasi_hari": None,
            "potensi_panen_air_hujan_liter": None,
        }

    # KALKULASI UTAMA
    kebutuhan_dasar = float(jumlah_anggota) * float(kebutuhan_per_orang)
    tambahan_mhm = float(jumlah_anggota_mhm) * float(tambahan_air_mhm_per_orang) if kebutuhan_mhm else 0.0
    kebutuhan_harian = kebutuhan_dasar + tambahan_mhm
    durasi = cadangan / kebutuhan_harian
    potensi_hujan = hitung_potensi_panen_air_hujan(luas_atap_m2)

    status_durasi, status, alasan = klasifikasikan_status(durasi, kondisi_sumber_air)

    return {
        "valid": True,
        "errors": [],
        "jumlah_anggota": int(jumlah_anggota),
        "jumlah_anggota_mhm": int(jumlah_anggota_mhm),
        "kebutuhan_dasar_liter": round(kebutuhan_dasar, 2),
        "tambahan_air_mhm_liter": round(tambahan_mhm, 2),
        "kebutuhan_harian_liter": round(kebutuhan_harian, 2),
        "cadangan_air_liter": round(cadangan, 2),
        "durasi_hari": round(durasi, 2),
        "potensi_panen_air_hujan_liter": potensi_hujan,
        "status_durasi": status_durasi,
        "status": status,
        "alasan_status": alasan,
        "waktu_perhitungan_utc": datetime.now(timezone.utc).isoformat(),
    }