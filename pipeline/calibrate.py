import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import create_client


# ==========================================
# KONFIGURASI PROJECT
# ==========================================

# Lokasi root project AIRA
ROOT_DIR = Path(__file__).resolve().parent.parent

# Membaca file .env.local dari root project
ENV_FILE = ROOT_DIR / ".env.local"

if not ENV_FILE.exists():
    raise FileNotFoundError(
        f"File .env.local tidak ditemukan: {ENV_FILE}"
    )

load_dotenv(ENV_FILE, override=False)


# ==========================================
# KONFIGURASI SUPABASE
# ==========================================

SUPABASE_URL = (
    os.getenv("SUPABASE_URL")
    or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
)

SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)

if not SUPABASE_URL:
    raise ValueError(
        "NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_URL "
        "belum ditemukan di .env.local"
    )

if not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError(
        "SUPABASE_SERVICE_ROLE_KEY belum ditemukan "
        "di .env.local"
    )


# ==========================================
# KONFIGURASI MODEL EMBEDDING
# ==========================================

MODEL_NAME = (
    "sentence-transformers/"
    "paraphrase-multilingual-mpnet-base-v2"
)

print("=" * 55)
print("AIRA - SIMILARITY THRESHOLD CALIBRATION")
print("=" * 55)

print("\nMemuat koneksi Supabase...")

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
)

print("Koneksi Supabase berhasil.")

print("\nMemuat model embedding...")
print(f"Model: {MODEL_NAME}")

model = SentenceTransformer(MODEL_NAME)

print("Model embedding berhasil dimuat.")


# ==========================================
# DATA PENGUJIAN
# ==========================================

PERTANYAAN = [
    (
        "relevan",
        "Cara menghemat air saat persediaan air menipis"
    ),
    (
        "relevan",
        "Menjaga kebersihan menstruasi saat air terbatas"
    ),
    (
        "relevan",
        "bu air di rumah tinggal dikit, gimana ngiritnya?"
    ),
    (
        "negatif",
        "Harga tiket pesawat dari Jakarta ke Bali"
    ),
    (
        "negatif",
        "Resep rendang padang yang enak"
    ),
]


# ==========================================
# PENGUJIAN RETRIEVAL
# ==========================================

hasil = {
    "relevan": [],
    "negatif": [],
}

print("\n" + "=" * 55)
print("MULAI PENGUJIAN RETRIEVAL")
print("=" * 55)

for index, (jenis, pertanyaan) in enumerate(
    PERTANYAAN,
    start=1
):
    try:
        # Membuat embedding pertanyaan
        embedding = model.encode(
            pertanyaan,
            normalize_embeddings=True
        ).tolist()

        # Mengambil dokumen paling relevan dari Supabase
        response = supabase.rpc(
            "match_document_chunks",
            {
                "query_embedding": embedding,
                "match_count": 1,
                "similarity_threshold": 0,
                "filter_category": None,
            }
        ).execute()

        rows = response.data or []

        # Mengambil similarity score
        skor = (
            float(rows[0]["similarity"])
            if rows
            else 0.0
        )

        hasil[jenis].append(skor)

        print(
            f"[{index}/{len(PERTANYAAN)}] "
            f"[{jenis.upper():8}] "
            f"{skor:.3f} | {pertanyaan}"
        )

    except Exception as error:
        print(
            f"\nERROR saat menguji pertanyaan: {pertanyaan}"
        )
        print(f"Detail: {error}")

        sys.exit(1)


# ==========================================
# RINGKASAN HASIL KALIBRASI
# ==========================================

print("\n" + "=" * 55)
print("HASIL KALIBRASI")
print("=" * 55)

if hasil["relevan"]:
    relevan_terendah = min(hasil["relevan"])

    print(
        f"Relevan terendah : {relevan_terendah:.3f}"
    )
else:
    relevan_terendah = None
    print("Tidak ada hasil pertanyaan relevan.")

if hasil["negatif"]:
    negatif_tertinggi = max(hasil["negatif"])

    print(
        f"Negatif tertinggi: {negatif_tertinggi:.3f}"
    )
else:
    negatif_tertinggi = None
    print("Tidak ada hasil pertanyaan negatif.")


# ==========================================
# SARAN SIMILARITY THRESHOLD
# ==========================================

print("\n" + "=" * 55)
print("REKOMENDASI THRESHOLD")
print("=" * 55)

if (
    relevan_terendah is not None
    and negatif_tertinggi is not None
):
    if negatif_tertinggi < relevan_terendah:

        threshold = (
            negatif_tertinggi + relevan_terendah
        ) / 2

        print(
            "Terdapat jarak antara hasil relevan "
            "dan negatif."
        )

        print(
            f"Rekomendasi awal: {threshold:.3f}"
        )

        print(
            "\nNilai tersebut dapat dijadikan "
            "titik awal pengujian threshold."
        )

    else:
        print(
            "PERHATIAN: Skor negatif dan relevan "
            "saling tumpang tindih."
        )

        print(
            "Belum ada batas threshold yang dapat "
            "memisahkan keduanya secara jelas."
        )

        print(
            "Pertahankan threshold rendah dan "
            "andalkan penyaringan Gemini."
        )

else:
    print(
        "Belum cukup data untuk menentukan threshold."
    )


# ==========================================
# SELESAI
# ==========================================

print("\n" + "=" * 55)
print("KALIBRASI SELESAI")
print("=" * 55)
